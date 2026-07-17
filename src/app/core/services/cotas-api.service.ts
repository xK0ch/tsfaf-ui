import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CategoryWithClasses,
  ConfirmRegistrationResponse,
  CotasContract,
  CotasDanceClass,
  CotasDanceClassesFilteredResponse,
  CotasDanceClassesResponse,
  CotasSiteConfig,
  CotasVoucher,
  CotasVoucherListResponse,
  CotasVoucherShowResponse,
  DanceClassCatalog,
  RegistrationPreviewResponse,
  RegistrationSubmitPayload,
  RegistrationSubmitResponse,
  VoucherOrderPayload,
  VoucherOrderResponse,
} from '../models/cotas.models';
// Re-export fuer convenience: Components koennen alle relevanten Typen
// ueber den Service-Pfad importieren ohne den models-Pfad zu kennen.
export type {
  CotasContract,
  CotasSiteConfig,
  CotasVoucher,
} from '../models/cotas.models';

const EMPTY_CONFIG: CotasSiteConfig = {
  enforce_no_partner_categories: [],
  enforce_partner_target_groups: [],
  phone: '04321 1 49 00',
};

/**
 * HTTP-Client fuer die selbstgebaute cotas-api.
 *
 * Eine Methode pro Endpoint plus loadCatalog() das die Roh-Antwort von
 * /danceclasses normalisiert und an die Komponente in einer
 * praesentations-freundlichen Form rauslegt.
 *
 * Base-URL kommt aus environment.cotasApiBase. Im Dev greift der Proxy.
 */
@Injectable({ providedIn: 'root' })
export class CotasApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.cotasApiBase;

  // ---------- Health ----------

  health(): Observable<{ status: string; time: string }> {
    return this.http.get<{ status: string; time: string }>(`${this.base}/health`);
  }

  // ---------- Site-Config ----------

  /**
   * Laedt Partner-Settings + Telefon aus der Server-Config
   * (cotas/config/<env>/config.json). Faellt im Fehlerfall auf einen
   * leeren Default zurueck damit die UI nicht haengt.
   *
   * Frueher kamen hier auch `no_online_registration` und `infotexts`
   * her — beide werden jetzt direkt aus dem kzclub-Flag der Kurse
   * abgeleitet (siehe kurse.ts). Server-Config-Felder duerfen daher
   * leer oder entfernt sein.
   */
  loadConfig(): Observable<CotasSiteConfig> {
    return this.http.get<CotasSiteConfig>(`${this.base}/config`).pipe(
      map(cfg => ({
        ...EMPTY_CONFIG,
        ...cfg,
        enforce_no_partner_categories: cfg?.enforce_no_partner_categories ?? [],
        enforce_partner_target_groups: cfg?.enforce_partner_target_groups ?? [],
      })),
    );
  }

  // ---------- Kursliste ----------

  /** Roh-Antwort der ungefilterten Liste (selten direkt benoetigt). */
  listDanceClasses(): Observable<CotasDanceClassesResponse> {
    return this.http.get<CotasDanceClassesResponse>(`${this.base}/danceclasses`);
  }

  /**
   * Laedt den vollen Katalog und normalisiert ihn zu einer
   * komponenten-freundlichen Struktur (Maps, sortierte Listen).
   */
  loadCatalog(): Observable<DanceClassCatalog> {
    return this.listDanceClasses().pipe(map(resp => normalizeCatalog(resp)));
  }

  /**
   * Gefilterte Kursliste fuer detaillierten Drill-Down. UUIDs aus Cotas X.
   * '0' bzw. leer = beliebig.
   */
  listDanceClassesFiltered(
    kategorieId: string,
    zielgruppeId: string,
  ): Observable<CotasDanceClassesFilteredResponse> {
    const params = new HttpParams()
      .set('kategorie', kategorieId || '0')
      .set('zielgruppe', zielgruppeId || '0');
    return this.http.get<CotasDanceClassesFilteredResponse>(`${this.base}/danceclasses`, { params });
  }

  // ---------- Anmeldung ----------

  previewRegistration(
    danceClassId: string,
    opts: { partner?: 0 | 1; debit_charge?: 0 | 1 } = {},
  ): Observable<RegistrationPreviewResponse> {
    let params = new HttpParams().set('id', danceClassId);
    if (opts.partner !== undefined) {
      params = params.set('partner', String(opts.partner));
    }
    if (opts.debit_charge !== undefined) {
      params = params.set('debit_charge', String(opts.debit_charge));
    }
    return this.http.get<RegistrationPreviewResponse>(`${this.base}/registrations/preview`, {
      params,
    });
  }

  submitRegistration(payload: RegistrationSubmitPayload): Observable<RegistrationSubmitResponse> {
    return this.http.post<RegistrationSubmitResponse>(`${this.base}/registrations`, payload);
  }

  confirmRegistration(session: string): Observable<ConfirmRegistrationResponse> {
    const params = new HttpParams().set('session', session);
    return this.http.get<ConfirmRegistrationResponse>(`${this.base}/registrations/confirm`, {
      params,
    });
  }

  // ---------- Gutscheine ----------

  listVouchers(): Observable<readonly CotasVoucher[]> {
    return this.http
      .get<CotasVoucherListResponse>(`${this.base}/vouchers`)
      .pipe(map(r => r?.vouchers ?? []));
  }

  getVoucher(id: string): Observable<CotasVoucher | null> {
    return this.http
      .get<CotasVoucherShowResponse>(`${this.base}/vouchers/${encodeURIComponent(id)}`)
      .pipe(map(r => r?.voucher ?? null));
  }

  orderVoucher(payload: VoucherOrderPayload): Observable<VoucherOrderResponse> {
    return this.http.post<VoucherOrderResponse>(`${this.base}/voucher-orders`, payload);
  }

  confirmVoucherOrder(session: string): Observable<VoucherOrderResponse> {
    const params = new HttpParams().set('session', session);
    return this.http.get<VoucherOrderResponse>(`${this.base}/voucher-orders/confirm`, { params });
  }

  /**
   * Absolute URL zum PDF-Druck eines bestaetigten Gutscheins. Frontend
   * verlinkt diese URL (Browser oeffnet PDF), das Backend streamt das
   * vom VoucherPrintService generierte TCPDF-Dokument.
   */
  voucherPrintUrl(session: string): string {
    return `${this.base}/voucher-orders/print?session=${encodeURIComponent(session)}`;
  }
}

/**
 * Normalisiert die Roh-Antwort von /danceclasses zu einer
 * Maps-basierten Struktur, die in der Component direkt konsumierbar ist.
 *
 * Roh-Form: dance_classes ist ein dict {tg_id: [[class, class, ...]]} mit
 * verschachtelten Arrays. Wir flachen das aus und gruppieren nach Kategorie.
 */
function normalizeCatalog(resp: CotasDanceClassesResponse): DanceClassCatalog {
  const targetGroups = [...(resp.target_groups ?? [])].sort(
    (a, b) => (a.priority ?? 0) - (b.priority ?? 0),
  );

  const classesByGroup = new Map<string, CotasDanceClass[]>();
  const categoriesByGroup = new Map<string, CategoryWithClasses[]>();

  for (const tg of targetGroups) {
    const raw = resp.dance_classes?.[tg.id];
    const flat = flattenClasses(raw).filter(c => !isPastNonClub(c));

    // Sortieren: erst kategorie_priority, dann kurs_bez
    flat.sort((a, b) => {
      const pa = parseInt(a.kategorie_priority, 10) || 0;
      const pb = parseInt(b.kategorie_priority, 10) || 0;
      if (pa !== pb) return pa - pb;
      return (a.kurs_bez ?? '').localeCompare(b.kurs_bez ?? '', 'de');
    });

    classesByGroup.set(tg.id, flat);

    // Kategorien aggregieren (nur die mit mind. einer Klasse)
    const catMap = new Map<string, CategoryWithClasses>();
    for (const c of flat) {
      const cid = c.kategorie_id;
      if (!cid) continue;
      let entry = catMap.get(cid);
      if (!entry) {
        entry = {
          id: cid,
          bez: c.kategorie_bez ?? cid,
          priority: parseInt(c.kategorie_priority, 10) || 0,
          classes: [],
        };
        catMap.set(cid, entry);
      }
      (entry.classes as CotasDanceClass[]).push(c);
    }
    const cats = [...catMap.values()].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.bez.localeCompare(b.bez, 'de');
    });
    categoriesByGroup.set(tg.id, cats);
  }

  return { targetGroups, classesByGroup, categoriesByGroup };
}

function flattenClasses(raw: CotasDanceClass[][] | CotasDanceClass[] | undefined): CotasDanceClass[] {
  if (!Array.isArray(raw)) return [];
  const out: CotasDanceClass[] = [];
  for (const item of raw) {
    if (Array.isArray(item)) {
      out.push(...item);
    } else if (item && typeof item === 'object') {
      out.push(item);
    }
  }
  return out;
}

/**
 * Filtert Kurse deren Anfangsdatum in der Vergangenheit liegt. Der von
 * Cotas gelieferte `finished`-Flag ist dafuer unzuverlaessig: bei
 * 8-Wochen-Kursen wird er offenbar erst nach `kurs_beginn + einheiten*7d`
 * gesetzt, sodass laengst gestartete Kurse noch als finished=0 kommen
 * und damit sichtbar bleiben (User-Beschwerde 07/2026: alte Mai-Kurse
 * standen im Juli noch drin, weil Cotas sie erst Mitte Juli als beendet
 * markiert). Wir entscheiden deshalb clientseitig anhand des Datums.
 *
 * Clubs (kzclub=1) sind ausgenommen — sie laufen kontinuierlich, ihr
 * `kurs_beginn` ist der historische Start und deshalb praktisch immer
 * in der Vergangenheit.
 */
function isPastNonClub(c: CotasDanceClass): boolean {
  const isClub =
    c.kzclub === '1' ||
    (typeof c.kzclub === 'number' && c.kzclub === 1);
  if (isClub) return false;

  // ISO-String "YYYY-MM-DD" -> Vergleich lexikografisch reicht. Wir
  // ziehen "heute" aus dem Client. Reine Datumsebene (kein Zeit-Offset)
  // reicht, weil Cotas kurs_beginn nur tagesgenau fuehrt.
  const beginn = (c.kurs_beginn ?? '').trim();
  if (!beginn) return false;
  const today = new Date();
  const iso =
    today.getFullYear().toString().padStart(4, '0') + '-' +
    (today.getMonth() + 1).toString().padStart(2, '0') + '-' +
    today.getDate().toString().padStart(2, '0');
  return beginn < iso;
}
