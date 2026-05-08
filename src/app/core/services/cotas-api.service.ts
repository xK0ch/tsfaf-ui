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
  DanceClassCatalog,
  RegistrationPreviewResponse,
  RegistrationSubmitPayload,
  RegistrationSubmitResponse,
  VoucherOrderPayload,
  VoucherOrderResponse,
  VoucherResponse,
} from '../models/cotas.models';
// Re-export fuer convenience: Components koennen alle relevanten Typen
// ueber den Service-Pfad importieren ohne den models-Pfad zu kennen.
export type { CotasContract, CotasSiteConfig } from '../models/cotas.models';

const EMPTY_CONFIG: CotasSiteConfig = {
  no_online_registration: [],
  infotexts: [],
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
   * Laedt no_online_registration / infotexts / Telefon usw. aus der
   * Server-Config (cotas/config/<env>/config.json). Faellt im Fehlerfall
   * auf einen leeren Default zurueck damit die UI nicht haengt.
   */
  loadConfig(): Observable<CotasSiteConfig> {
    return this.http.get<CotasSiteConfig>(`${this.base}/config`).pipe(
      map(cfg => ({
        ...EMPTY_CONFIG,
        ...cfg,
        no_online_registration: cfg?.no_online_registration ?? [],
        infotexts: cfg?.infotexts ?? [],
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

  getVoucher(id: string): Observable<VoucherResponse> {
    return this.http.get<VoucherResponse>(`${this.base}/vouchers/${encodeURIComponent(id)}`);
  }

  orderVoucher(payload: VoucherOrderPayload): Observable<VoucherOrderResponse> {
    return this.http.post<VoucherOrderResponse>(`${this.base}/voucher-orders`, payload);
  }

  confirmVoucherOrder(session: string): Observable<VoucherOrderResponse> {
    const params = new HttpParams().set('session', session);
    return this.http.get<VoucherOrderResponse>(`${this.base}/voucher-orders/confirm`, { params });
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
    const flat = flattenClasses(raw).filter(c => !isFinishedNonClub(c));

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
 * Spiegelt das Filter-Verhalten der alten PHP-Seite:
 *   if (!$dance_class->finished || $dance_class->kzclub) ... zeigen
 * Sprich: abgelaufene Kurse rausschmeissen, ausser es ist ein laufender
 * Club (kzclub == 1). Damit verschwinden vom Chef "abgelaufene"
 * Termine genau wie auf der alten Webseite.
 */
function isFinishedNonClub(c: CotasDanceClass): boolean {
  const finished =
    c.finished === 1 ||
    (typeof c.finished === 'string' && c.finished === '1') ||
    (typeof c.finished === 'boolean' && c.finished);

  const isClub =
    c.kzclub === '1' ||
    (typeof c.kzclub === 'number' && c.kzclub === 1);

  return finished && !isClub;
}
