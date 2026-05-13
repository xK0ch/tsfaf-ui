import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import {
  GalleryApiService,
  type RawAlbum,
  type RawAlbumDetail,
} from './gallery-api.service';
import { environment } from '../../../environments/environment';

describe('GalleryApiService', () => {
  let service: GalleryApiService;
  let http: HttpTestingController;
  const BASE = environment.galleryApiBase;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), GalleryApiService],
    });
    service = TestBed.inject(GalleryApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  // ─── listAlbums ─────────────────────────────────────────────────

  it('listAlbums: GET ?albums mit X-Gallery-Token Header', () => {
    let received: readonly RawAlbum[] | undefined;
    service.listAlbums().subscribe(r => (received = r));

    const req = http.expectOne(r => r.url === `${BASE}?albums`);
    expect(req.request.method).toBe('GET');
    if (environment.galleryToken) {
      expect(req.request.headers.get('X-Gallery-Token')).toBe(environment.galleryToken);
    }
    req.flush({
      albums: [
        {
          id: 201,
          title: 'Tanz in den Mai 2026',
          alias: 'tanz-in-den-mai-2026',
          description: '',
          date: '2026-05-03 20:09:42',
          imageCount: 120,
          cover: {
            thumb: 'https://example.com/cover-thumb.jpg',
            detail: 'https://example.com/cover-detail.jpg',
          },
        },
      ],
    });

    expect(received).toHaveLength(1);
    expect(received![0].id).toBe(201);
    expect(received![0].alias).toBe('tanz-in-den-mai-2026');
  });

  it('listAlbums: leere Response liefert leeres Array', () => {
    let received: readonly RawAlbum[] | undefined;
    service.listAlbums().subscribe(r => (received = r));
    http.expectOne(r => r.url === `${BASE}?albums`).flush({ albums: [] });
    expect(received).toEqual([]);
  });

  it('listAlbums: response ohne albums-Property -> leeres Array', () => {
    let received: readonly RawAlbum[] | undefined;
    service.listAlbums().subscribe(r => (received = r));
    http.expectOne(r => r.url === `${BASE}?albums`).flush({});
    expect(received).toEqual([]);
  });

  // ─── getAlbumImages ─────────────────────────────────────────────

  it('getAlbumImages: GET mit album, page, per_page Params', () => {
    let received: RawAlbumDetail | undefined;
    service.getAlbumImages(42, 100).subscribe(r => (received = r));

    const req = http.expectOne(r => r.url === BASE);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('album')).toBe('42');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('per_page')).toBe('100');
    req.flush({
      album: {
        id: 42, title: 'X', alias: 'x', description: '',
        date: '2026-01-01 00:00:00', imageCount: 2,
      },
      images: [
        {
          id: 1, title: 'A', alias: 'a', description: '',
          date: '2026-01-01 00:00:00',
          thumb: 'https://x/thumb1.jpg',
          detail: 'https://x/det1.jpg',
          original: 'https://x/orig1.jpg',
        },
      ],
      page: 1, perPage: 100, totalPages: 1,
    });

    expect(received?.images).toHaveLength(1);
    expect(received?.album.id).toBe(42);
  });

  it('getAlbumImages: Default per_page = 1000', () => {
    service.getAlbumImages(7).subscribe();
    const req = http.expectOne(r => r.url === BASE);
    expect(req.request.params.get('per_page')).toBe('1000');
    req.flush({
      album: { id: 7, title: '', alias: '', description: '', date: '', imageCount: 0 },
      images: [], page: 1, perPage: 1000, totalPages: 0,
    });
  });
});
