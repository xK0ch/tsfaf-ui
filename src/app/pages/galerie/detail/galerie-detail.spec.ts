import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, EMPTY, Observable, of, throwError } from 'rxjs';

import { GalerieDetail } from './galerie-detail';
import { GalleryApiService, type RawAlbumDetail } from '../../../core/services/gallery-api.service';
import { GalleryStore, type Album } from '../galerie-data';

// ─── Helpers ──────────────────────────────────────────────────────

function mkAlbum(over: Partial<Album> = {}): Album {
  return {
    id: 1,
    alias: 'tanz-in-den-mai-2026',
    title: 'Tanz in den Mai 2026',
    description: '',
    date: new Date('2026-05-03T00:00:00'),
    dateLong: '3. Mai 2026',
    dateShort: 'Mai 2026',
    imageCount: 3,
    coverUrl: 'https://x/cover.jpg',
    ...over,
  };
}

function mkAlbumDetail(imageCount = 3): RawAlbumDetail {
  return {
    album: {
      id: 1,
      title: 'Tanz in den Mai 2026',
      alias: 'tanz-in-den-mai-2026',
      description: '',
      date: '2026-05-03 20:09:42',
      imageCount,
    },
    images: Array.from({ length: imageCount }, (_, i) => ({
      id: i + 1,
      title: `Bild ${i + 1}`,
      alias: `bild-${i + 1}`,
      description: '',
      date: '2026-05-03 20:09:42',
      thumb: `https://x/t${i + 1}.jpg`,
      detail: `https://x/d${i + 1}.jpg`,
      original: `https://x/o${i + 1}.jpg`,
    })),
    page: 1,
    perPage: 1000,
    totalPages: 1,
  };
}

function makeStoreMock(initialAlbums: readonly Album[] | null) {
  const albums = signal<readonly Album[] | null>(initialAlbums);
  return {
    albums,
    loading: computed(() => albums() === null),
    byAlias: (alias: string) => albums()?.find(a => a.alias === alias) ?? null,
  };
}

function makeRoute(alias: string) {
  const params$ = new BehaviorSubject(convertToParamMap({ alias }));
  return {
    paramMap: params$.asObservable(),
  };
}

interface RouterSpy {
  navigate: (cmds: unknown[], extras?: unknown) => Promise<boolean>;
  events: Observable<never>;
  createUrlTree: () => null;
  serializeUrl: () => string;
  navigateCalls: { cmds: unknown[]; extras: unknown }[];
}

function makeRouterSpy(): RouterSpy {
  const calls: { cmds: unknown[]; extras: unknown }[] = [];
  return {
    navigate: (cmds, extras) => {
      calls.push({ cmds, extras });
      return Promise.resolve(true);
    },
    events: EMPTY,
    createUrlTree: () => null,
    serializeUrl: () => '',
    get navigateCalls() {
      return calls;
    },
  };
}

interface ApiMock {
  getAlbumImages: (id: number) => Observable<RawAlbumDetail>;
  imageCalls: number[];
}

function makeApiMock(
  responseFn: (id: number) => Observable<RawAlbumDetail> = () => of(mkAlbumDetail()),
): ApiMock {
  const calls: number[] = [];
  return {
    getAlbumImages: (id: number) => {
      calls.push(id);
      return responseFn(id);
    },
    get imageCalls() {
      return calls;
    },
  };
}

// ─── Tests ────────────────────────────────────────────────────────

describe('GalerieDetail', () => {
  function setup(opts: {
    albums?: readonly Album[] | null;
    alias?: string;
    apiResponse?: (id: number) => Observable<RawAlbumDetail>;
  } = {}) {
    const albums = 'albums' in opts ? opts.albums ?? null : [mkAlbum()];
    const storeMock = makeStoreMock(albums);
    const apiMock = makeApiMock(opts.apiResponse);
    const routerSpy = makeRouterSpy();
    const route = makeRoute(opts.alias ?? 'tanz-in-den-mai-2026');

    TestBed.configureTestingModule({
      imports: [GalerieDetail],
      providers: [
        { provide: GalleryStore, useValue: storeMock },
        { provide: GalleryApiService, useValue: apiMock },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: route },
      ],
    });
    const fixture = TestBed.createComponent(GalerieDetail);
    return { fixture, storeMock, apiMock, routerSpy };
  }

  // ─── Loading-States ────────────────────────────────────────────

  it('zeigt Loading-Status solange Alben-Store laedt', () => {
    const { fixture } = setup({ albums: null });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.detail-status')?.textContent).toContain(
      'Album wird geladen',
    );
  });

  it('zeigt Bilder-Loading wenn Album geladen, Bilder aber noch nicht', () => {
    // API-Response, die nie emittiert
    const never$ = new Observable<RawAlbumDetail>(() => {
      // never emits
    });
    const { fixture } = setup({ apiResponse: () => never$ });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Bilder werden geladen');
  });

  // ─── Album-Render ──────────────────────────────────────────────

  it('rendert Album-Titel + Datum + Bildanzahl im Hero', () => {
    const { fixture } = setup({
      albums: [mkAlbum({ title: 'Mein Album', dateLong: '5. Mai 2026', imageCount: 12 })],
    });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.page-title')?.textContent).toContain('Mein Album');
    expect(el.querySelector('.page-sub')?.textContent).toContain('5. Mai 2026');
    expect(el.querySelector('.page-sub')?.textContent).toContain('12 Fotos');
  });

  // ─── Bilder-Fetch ──────────────────────────────────────────────

  it('feuert getAlbumImages(album.id) sobald Album da ist', () => {
    const { fixture, apiMock } = setup({
      albums: [mkAlbum({ id: 42 })],
    });
    fixture.detectChanges();
    expect(apiMock.imageCalls).toEqual([42]);
  });

  it('rendert ein Thumbnail pro Bild der API-Response', () => {
    const { fixture } = setup({ apiResponse: () => of(mkAlbumDetail(5)) });
    fixture.detectChanges();
    const thumbs = (fixture.nativeElement as HTMLElement).querySelectorAll('.photo-thumb');
    expect(thumbs.length).toBe(5);
  });

  it('Empty-Hinweis wenn API-Response leer ist', () => {
    const { fixture } = setup({ apiResponse: () => of(mkAlbumDetail(0)) });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('keine Bilder hinterlegt');
  });

  it('Error im Image-Fetch -> leere Liste + Empty-Hinweis', () => {
    const { fixture } = setup({
      apiResponse: () => throwError(() => new Error('boom')),
    });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('keine Bilder hinterlegt');
  });

  // ─── Not-Found-Redirect ──────────────────────────────────────────

  it('navigiert zur Galerie-Uebersicht wenn Alias zu keinem Album passt', () => {
    const { fixture, routerSpy } = setup({
      albums: [mkAlbum({ alias: 'andere' })],
      alias: 'tippfehler',
    });
    fixture.detectChanges();
    expect(routerSpy.navigateCalls.length).toBeGreaterThanOrEqual(1);
    expect(routerSpy.navigateCalls[0].cmds).toEqual(['/galerie']);
  });

  it('navigiert NICHT solange Store noch laedt', () => {
    const { fixture, routerSpy } = setup({ albums: null, alias: 'nope' });
    fixture.detectChanges();
    expect(routerSpy.navigateCalls.length).toBe(0);
  });

  // ─── Lightbox-Toggle ────────────────────────────────────────────

  it('openLightbox setzt lightboxOpen auf true', () => {
    const { fixture } = setup({ apiResponse: () => of(mkAlbumDetail(3)) });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      openLightbox(i: number): void;
      lightboxOpen: { (): boolean };
      lightboxIdx: { (): number | null };
    };
    cmp.openLightbox(2);
    expect(cmp.lightboxOpen()).toBe(true);
    expect(cmp.lightboxIdx()).toBe(2);
  });

  it('closeLightbox setzt lightboxIdx auf null', () => {
    const { fixture } = setup({ apiResponse: () => of(mkAlbumDetail(3)) });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      openLightbox(i: number): void;
      closeLightbox(): void;
      lightboxOpen: { (): boolean };
    };
    cmp.openLightbox(1);
    cmp.closeLightbox();
    expect(cmp.lightboxOpen()).toBe(false);
  });

  it('onThumbKey Enter/Space oeffnet Lightbox', () => {
    const { fixture } = setup({ apiResponse: () => of(mkAlbumDetail(3)) });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      onThumbKey(e: KeyboardEvent, i: number): void;
      lightboxOpen: { (): boolean };
      lightboxIdx: { (): number | null };
    };
    cmp.onThumbKey(new KeyboardEvent('keydown', { key: 'Enter' }), 1);
    expect(cmp.lightboxOpen()).toBe(true);
    expect(cmp.lightboxIdx()).toBe(1);

    // andere Taste tut nichts
    cmp.onThumbKey(new KeyboardEvent('keydown', { key: 'a' }), 2);
    expect(cmp.lightboxIdx()).toBe(1);
  });
});
