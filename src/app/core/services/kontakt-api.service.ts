import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { environment } from '../../../environments/environment';

/** Payload den unser kontakt-api.php erwartet. */
export interface KontaktFormPayload {
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly subject: string;
  readonly message: string;
  readonly datenschutz: boolean;
  /** Hidden-Input, sollte immer leer sein (Bot-Filter). */
  readonly honeypot: string;
}

/**
 * Ergebnis-Typen die wir an die Kontakt-Komponente zurueckgeben.
 *
 * `sent`        — Backend hat 200/sent geantwortet, Mail ist raus
 * `validation`  — Server hat ein Feld als ungueltig markiert, optional
 *                 `field` enthaelt welches (Frontend-Validation greift
 *                 eigentlich vorher, das hier ist Defense-in-Depth)
 * `network`     — Netzwerk-/Server-Fehler, Mail wurde NICHT verschickt
 */
export type KontaktResult =
  | { kind: 'sent' }
  | { kind: 'validation'; field?: string }
  | { kind: 'network' };

@Injectable({ providedIn: 'root' })
export class KontaktApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.kontaktApiBase;
  private readonly token = environment.kontaktToken;

  send(payload: KontaktFormPayload): Observable<KontaktResult> {
    return this.http
      .post<{ status: string }>(this.base, payload, {
        headers: this.authHeaders(),
      })
      .pipe(
        map((): KontaktResult => ({ kind: 'sent' })),
        catchError((err: HttpErrorResponse): Observable<KontaktResult> => {
          if (err.status === 422) {
            const field = typeof err.error?.field === 'string' ? err.error.field : undefined;
            return of({ kind: 'validation', field });
          }
          return of({ kind: 'network' });
        }),
      );
  }

  private authHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Kontakt-Token': this.token,
    });
  }
}
