import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';

// ─── Raw API-Response-Typen ───────────────────────────────────────

export interface RawAlbum {
  id: number;
  title: string;
  alias: string;
  description: string;
  date: string;
  imageCount: number;
  cover: { thumb: string; detail: string } | null;
}

export interface RawImage {
  id: number;
  title: string;
  alias: string;
  description: string;
  date: string;
  thumb: string;
  detail: string;
  original: string;
}

export interface RawAlbumDetail {
  album: {
    id: number;
    title: string;
    alias: string;
    description: string;
    date: string;
    imageCount: number;
  };
  images: readonly RawImage[];
  page: number;
  perPage: number;
  totalPages: number;
}

/**
 * Read-only Client fuer das custom gallery-api.php (liegt im
 * Joomla-Webroot, liest JoomGallery-DB direkt). Token-Auth via
 * X-Gallery-Token-Header. Endpoints:
 *
 *   GET ?albums              -> Alben + Cover-Thumbnails
 *   GET ?album=<id>          -> Album-Bilder (paginiert)
 *
 * Im Dev geht der Call durch den Angular-Dev-Proxy (proxy.conf.json),
 * im Prod direkt an die Joomla-Domain mit CORS.
 */
@Injectable({ providedIn: 'root' })
export class GalleryApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.galleryApiBase;
  private readonly token = environment.galleryToken;

  listAlbums(): Observable<readonly RawAlbum[]> {
    return this.http
      .get<{ albums: readonly RawAlbum[] }>(`${this.base}?albums`, {
        headers: this.authHeaders(),
      })
      .pipe(map(r => r?.albums ?? []));
  }

  /**
   * Liefert die Bilder eines Albums. Default per_page = 1000 weil
   * unser Maximum pro Album ~270 ist und wir den Aufwand sparen,
   * client-seitig mehrere Pages zu mergen.
   */
  getAlbumImages(albumId: number, perPage = 1000): Observable<RawAlbumDetail> {
    const params = new HttpParams()
      .set('album', String(albumId))
      .set('page', '1')
      .set('per_page', String(perPage));
    return this.http.get<RawAlbumDetail>(this.base, {
      params,
      headers: this.authHeaders(),
    });
  }

  private authHeaders(): HttpHeaders {
    return this.token
      ? new HttpHeaders({ 'X-Gallery-Token': this.token })
      : new HttpHeaders();
  }
}
