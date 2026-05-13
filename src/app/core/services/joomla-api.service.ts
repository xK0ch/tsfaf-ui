import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  JoomlaArticle,
  JoomlaArticleAttributes,
  JoomlaCategory,
  JoomlaCategoryAttributes,
  JoomlaResource,
  JoomlaResponse,
  mapArticle,
  mapCategory,
} from '../models/joomla.models';

/**
 * Read-only Client fuer die Joomla Web Services API.
 *
 * Token kommt aus environment.joomlaToken. Der Token darf laut Setup nur
 * com_content + com_fields lesen (core.admin Allowed, keine
 * Create/Edit/Delete) — Leak-Risiko gering, aber dennoch nicht committen.
 *
 * Im Dev geht der Call durch den Angular-Dev-Proxy
 * (proxy.conf.json: /joomla-api -> www.tanzschule-...), umgeht CORS.
 * Im Prod ruft Angular direkt www.tanzschule-... an; dafuer braucht
 * Joomla eine CORS-Allow-Origin Konfiguration fuer neu.tanzschule-...
 * (machen wir wenn das Frontend Joomla-Daten produktiv anzeigt).
 */
@Injectable({ providedIn: 'root' })
export class JoomlaApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.joomlaApiBase;
  private readonly token = environment.joomlaToken;

  // ---------- Articles ----------

  /**
   * Liste der Articles, optional gefiltert nach Kategorie + Status.
   * Default: nur veroeffentlichte (state=1).
   *
   * `orderBy` + `orderDirection` triggern serverseitiges Sortieren via
   * Joomla's ListModel (`list[ordering]=<col>&list[direction]=asc|desc`).
   * Erlaubte Werte fuer orderBy sind alles was in der ArticlesModel
   * `filter_fields` whitelist steht, am haeufigsten genutzt: `ordering`,
   * `created`, `publish_up`, `title`, `id`.
   */
  listArticles(opts: {
    categoryId?: string | number;
    state?: number;
    /** Limit pro Seite, Joomla-Default 20 */
    limit?: number;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
  } = {}): Observable<readonly JoomlaArticle[]> {
    let params = new HttpParams();
    if (opts.categoryId !== undefined) {
      params = params.set('filter[category]', String(opts.categoryId));
    }
    params = params.set('filter[state]', String(opts.state ?? 1));
    if (opts.limit) {
      params = params.set('page[limit]', String(opts.limit));
    }
    if (opts.orderBy) {
      params = params.set('list[ordering]', opts.orderBy);
      params = params.set('list[direction]', opts.orderDirection ?? 'asc');
    }

    return this.http
      .get<JoomlaResponse<readonly JoomlaResource<JoomlaArticleAttributes>[]>>(
        `${this.base}/content/articles`,
        { params, headers: this.authHeaders() },
      )
      .pipe(map(r => (r?.data ?? []).map(mapArticle)));
  }

  getArticle(id: string | number): Observable<JoomlaArticle | null> {
    return this.http
      .get<JoomlaResponse<JoomlaResource<JoomlaArticleAttributes>>>(
        `${this.base}/content/articles/${encodeURIComponent(String(id))}`,
        { headers: this.authHeaders() },
      )
      .pipe(map(r => (r?.data ? mapArticle(r.data) : null)));
  }

  // ---------- Categories ----------

  listCategories(): Observable<readonly JoomlaCategory[]> {
    return this.http
      .get<JoomlaResponse<readonly JoomlaResource<JoomlaCategoryAttributes>[]>>(
        `${this.base}/content/categories`,
        { headers: this.authHeaders() },
      )
      .pipe(map(r => (r?.data ?? []).map(mapCategory)));
  }

  getCategory(id: string | number): Observable<JoomlaCategory | null> {
    return this.http
      .get<JoomlaResponse<JoomlaResource<JoomlaCategoryAttributes>>>(
        `${this.base}/content/categories/${encodeURIComponent(String(id))}`,
        { headers: this.authHeaders() },
      )
      .pipe(map(r => (r?.data ? mapCategory(r.data) : null)));
  }

  // ---------- Internal ----------

  private authHeaders(): HttpHeaders {
    return this.token
      ? new HttpHeaders({ 'X-Joomla-Token': this.token })
      : new HttpHeaders();
  }
}
