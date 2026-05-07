import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ConfirmRegistrationResponse,
  DanceClassesCombinedResponse,
  DanceClassesFilteredResponse,
  DanceClassesResponse,
  RegistrationPreviewResponse,
  RegistrationSubmitPayload,
  RegistrationSubmitResponse,
  VoucherOrderPayload,
  VoucherOrderResponse,
  VoucherResponse,
} from '../models/cotas.models';

/**
 * HTTP-Client fuer die selbstgebaute cotas-api.
 *
 * Eine Methode pro Endpoint. Returns sind Observables. Components werden
 * typischerweise per `toSignal(...)` daraus Signals machen.
 *
 * Die Base-URL kommt aus environment.cotasApiBase. Im Dev-Build greift der
 * Angular-Dev-Server-Proxy (proxy.conf.json) und leitet '/cotas-api' an
 * die lokale PHP-Instanz weiter. Im Prod-Build zeigt die Base relativ
 * auf '/cotas-webmodule/cotas/api', d.h. same-origin.
 */
@Injectable({ providedIn: 'root' })
export class CotasApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.cotasApiBase;

  // ---------- Health ----------

  health(): Observable<{ status: string; time: string }> {
    return this.http.get<{ status: string; time: string }>(`${this.base}/health`);
  }

  // ---------- Kursliste ----------

  /**
   * Voller Kurs-Katalog ohne Filter.
   */
  listDanceClasses(): Observable<DanceClassesResponse> {
    return this.http.get<DanceClassesResponse>(`${this.base}/danceclasses`);
  }

  /**
   * Gefilterte Kursliste. UUIDs aus Cotas X. '0' bzw. leer = beliebig.
   */
  listDanceClassesFiltered(
    kategorieId: string,
    zielgruppeId: string,
  ): Observable<DanceClassesFilteredResponse> {
    const params = new HttpParams()
      .set('kategorie', kategorieId || '0')
      .set('zielgruppe', zielgruppeId || '0');
    return this.http.get<DanceClassesFilteredResponse>(`${this.base}/danceclasses`, { params });
  }

  /**
   * Kategorien mit eingebetteten Kursen, Filter per Zielgruppen-Namen-Praefix.
   * Aufruf z.B. mit "Kinder" -> liefert alle Kinder-Kategorien mit ihren Kursen.
   */
  listDanceClassesCombined(targetGroupName: string): Observable<DanceClassesCombinedResponse> {
    const params = new HttpParams().set('name', targetGroupName);
    return this.http.get<DanceClassesCombinedResponse>(`${this.base}/danceclasses/combined`, {
      params,
    });
  }

  // ---------- Anmeldung ----------

  /**
   * Holt Vorabdaten fuers Anmeldeformular (Kurs, Kategorie, Default-Toggles).
   */
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

  /**
   * Sendet das ausgefuellte Anmeldeformular ab. Backend validiert, persistiert
   * und schickt Bestaetigungs-Mail. Bei Validation-Errors kommt
   * { errors: true, err_<feld>: 1, ... } mit HTTP 422 zurueck.
   */
  submitRegistration(payload: RegistrationSubmitPayload): Observable<RegistrationSubmitResponse> {
    return this.http.post<RegistrationSubmitResponse>(`${this.base}/registrations`, payload);
  }

  /**
   * Wird vom Bestaetigungs-Mail-Link aufgerufen.
   */
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
