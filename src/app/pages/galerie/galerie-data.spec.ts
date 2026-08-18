import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import {
  GalleryStore,
  mapAlbum,
  mapPhoto,
  type Album,
} from './galerie-data';
import type {
  RawAlbum,
  RawImage,
} from '../../core/services/gallery-api.service';
import { environment } from '../../../environments/environment';

// ─── Helpers ──────────────────────────────────────────────────────

function mkRawAlbum(over: Partial<RawAlbum> = {}): RawAlbum {
  return {
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
    ...over,
  };
}

function mkRawImage(over: Partial<RawImage> = {}): RawImage {
  return {
    id: 1,
    title: 'Bild 1',
    alias: 'bild-1',
    description: '',
    date: '2026-01-01 00:00:00',
    thumb: 'https://x/thumb1.jpg',
    detail: 'https://x/det1.jpg',
    original: 'https://x/orig1.jpg',
    ...over,
  };
}

// ─── mapAlbum ─────────────────────────────────────────────────────

describe('mapAlbum', () => {
  it('mapped Standardfelder', () => {
    const a = mapAlbum(mkRawAlbum({ id: 42, title: 'X', alias: 'x' }));
    expect(a.id).toBe(42);
    expect(a.title).toBe('X');
    expect(a.alias).toBe('x');
  });

  it('parst Datum aus "YYYY-MM-DD HH:MM:SS"', () => {
    const a = mapAlbum(mkRawAlbum({ date: '2026-05-03 20:09:42' }));
    expect(a.date.getFullYear()).toBe(2026);
    expect(a.date.getMonth()).toBe(4); // Mai
    expect(a.date.getDate()).toBe(3);
  });

  it('coverUrl bevorzugt cover.detail (schärfer auf Retina)', () => {
    const a = mapAlbum(mkRawAlbum({
      cover: { thumb: 'https://x/thumb.jpg', detail: 'https://x/detail.jpg' },
    }));
    expect(a.coverUrl).toBe('https://x/detail.jpg');
  });

  it('coverUrl fällt auf cover.thumb zurück wenn detail fehlt (Backward-Compat)', () => {
    const a = mapAlbum(mkRawAlbum({
      cover: { thumb: 'https://x/thumb.jpg' } as unknown as { thumb: string; detail: string },
    }));
    expect(a.coverUrl).toBe('https://x/thumb.jpg');
  });

  it('coverUrl null wenn kein Cover gesetzt', () => {
    const a = mapAlbum(mkRawAlbum({ cover: null }));
    expect(a.coverUrl).toBeNull();
  });

  it('dateLong + dateShort sind in de-DE lokalisiert', () => {
    const a = mapAlbum(mkRawAlbum({ date: '2026-05-03 00:00:00' }));
    expect(a.dateLong).toMatch(/3\.?\s*Mai\s*2026/);
    expect(a.dateShort.toLowerCase()).toContain('mai');
  });

  it('description-Fallback auf leeren String', () => {
    const a = mapAlbum(mkRawAlbum({ description: undefined as unknown as string }));
    expect(a.description).toBe('');
  });
});

// ─── mapPhoto ─────────────────────────────────────────────────────

describe('mapPhoto', () => {
  it('mapped Standardfelder + alle 3 URL-Varianten', () => {
    const p = mapPhoto(mkRawImage());
    expect(p.id).toBe(1);
    expect(p.thumb).toBe('https://x/thumb1.jpg');
    expect(p.detail).toBe('https://x/det1.jpg');
    expect(p.original).toBe('https://x/orig1.jpg');
  });

  it('caption aus title, sonst description, sonst "Bild <id>"', () => {
    expect(mapPhoto(mkRawImage({ id: 5, title: 'Titel', description: 'Desc' })).caption).toBe('Titel');
    expect(mapPhoto(mkRawImage({ id: 5, title: '', description: 'Desc' })).caption).toBe('Desc');
    expect(mapPhoto(mkRawImage({ id: 5, title: '   ', description: '' })).caption).toBe('Bild 5');
  });
});

// ─── GalleryStore ─────────────────────────────────────────────────

describe('GalleryStore', () => {
  let http: HttpTestingController;
  const BASE = environment.galleryApiBase;

  function setupStore(): GalleryStore {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), GalleryStore],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(GalleryStore);
  }

  afterEach(() => {
    http.verify();
  });

  it('loading() vor Flush true, danach false', () => {
    const store = setupStore();
    expect(store.loading()).toBe(true);
    http.expectOne(r => r.url === `${BASE}?albums`).flush({ albums: [] });
    expect(store.loading()).toBe(false);
  });

  it('albums liefert mapped Albums in API-Reihenfolge', () => {
    const store = setupStore();
    http.expectOne(r => r.url === `${BASE}?albums`).flush({
      albums: [
        mkRawAlbum({ id: 1, alias: 'alpha' }),
        mkRawAlbum({ id: 2, alias: 'beta' }),
      ],
    });
    const got = store.albums();
    expect(got?.map((a: Album) => a.alias)).toEqual(['alpha', 'beta']);
  });

  it('byAlias liefert Album wenn gefunden, sonst null', () => {
    const store = setupStore();
    http.expectOne(r => r.url === `${BASE}?albums`).flush({
      albums: [mkRawAlbum({ id: 1, alias: 'foo' })],
    });
    expect(store.byAlias('foo')?.id).toBe(1);
    expect(store.byAlias('nope')).toBeNull();
  });

  it('byAlias liefert null waehrend des Ladens', () => {
    const store = setupStore();
    expect(store.byAlias('foo')).toBeNull();
    http.expectOne(r => r.url === `${BASE}?albums`).flush({ albums: [] });
  });
});
