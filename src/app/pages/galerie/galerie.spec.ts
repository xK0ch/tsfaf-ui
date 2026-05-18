import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
  Router,
} from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { Galerie } from './galerie';
import { GalleryStore, type Album } from './galerie-data';

function mkAlbum(over: Partial<Album> = {}): Album {
  return {
    id: 1,
    alias: 'alpha',
    title: 'Alpha-Album',
    description: '',
    date: new Date('2026-05-01T00:00:00'),
    dateLong: '1. Mai 2026',
    dateShort: 'Mai 2026',
    imageCount: 10,
    coverUrl: 'https://example.com/cover.jpg',
    ...over,
  };
}

function makeStoreMock(initial: readonly Album[] | null) {
  const albums = signal<readonly Album[] | null>(initial);
  return {
    albums,
    loading: computed(() => albums() === null),
    byAlias: (alias: string) => albums()?.find(a => a.alias === alias) ?? null,
  };
}

function makeRoute(page?: string) {
  const initial: Record<string, string> = {};
  if (page !== undefined) initial['page'] = page;
  const params$ = new BehaviorSubject(convertToParamMap(initial));
  return {
    queryParamMap: params$.asObservable(),
  };
}

interface NavigateCall {
  cmds: unknown[];
  extras: unknown;
}

describe('Galerie', () => {
  function setup(opts: {
    albums?: readonly Album[] | null;
    initialPage?: string;
  } = {}) {
    const albums = 'albums' in opts ? opts.albums ?? null : [];
    const route = makeRoute(opts.initialPage);

    TestBed.configureTestingModule({
      imports: [Galerie],
      providers: [
        provideRouter([]),
        { provide: GalleryStore, useValue: makeStoreMock(albums) },
        { provide: ActivatedRoute, useValue: route },
      ],
    });

    // Echten Router fuer RouterLink-href verwenden, nur navigate() spyen.
    const router = TestBed.inject(Router);
    const navigateCalls: NavigateCall[] = [];
    router.navigate = ((cmds: unknown[], extras?: unknown) => {
      navigateCalls.push({ cmds, extras });
      return Promise.resolve(true);
    }) as Router['navigate'];

    const fixture = TestBed.createComponent(Galerie);
    return { fixture, navigateCalls };
  }

  // ─── Loading / Empty ────────────────────────────────────────────

  it('zeigt Loading-Status solange Store laedt', () => {
    const { fixture } = setup({ albums: null });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.gallery-status')?.textContent).toContain(
      'Alben werden geladen',
    );
    expect(el.querySelector('.album-grid')).toBeNull();
  });

  it('zeigt Empty-State wenn keine Alben da sind', () => {
    const { fixture } = setup({ albums: [] });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.gallery-status')?.textContent).toContain(
      'keine Alben hinterlegt',
    );
  });

  // ─── Rendering ──────────────────────────────────────────────────

  it('rendert ein Album-Card pro Album', () => {
    const { fixture } = setup({
      albums: [
        mkAlbum({ id: 1, alias: 'a' }),
        mkAlbum({ id: 2, alias: 'b' }),
        mkAlbum({ id: 3, alias: 'c' }),
      ],
    });
    fixture.detectChanges();
    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('.album-card');
    expect(cards.length).toBe(3);
  });

  it('Album-Card verlinkt auf /galerie/<alias>', () => {
    const { fixture } = setup({
      albums: [mkAlbum({ id: 1, alias: 'tanz-in-den-mai-2026', title: 'Tanz' })],
    });
    fixture.detectChanges();
    const link = (fixture.nativeElement as HTMLElement).querySelector(
      '.album-card',
    ) as HTMLAnchorElement | null;
    expect(link?.getAttribute('href')).toContain('/galerie/tanz-in-den-mai-2026');
  });

  it('zeigt imageCount + dateShort in der Card', () => {
    const { fixture } = setup({
      albums: [mkAlbum({ imageCount: 42, dateShort: 'Juni 2026' })],
    });
    fixture.detectChanges();
    const meta = (fixture.nativeElement as HTMLElement).querySelector('.album-meta')?.textContent ?? '';
    expect(meta).toContain('42');
    expect(meta).toContain('Juni 2026');
  });

  // ─── Reihenfolge: API-Order respektieren ────────────────────────

  it('respektiert die API-Reihenfolge (Drag&Drop im Backend, kein client-seitiges Re-Sort)', () => {
    const { fixture } = setup({
      albums: [
        mkAlbum({ id: 1, alias: 'first', date: new Date('2024-01-01') }),
        mkAlbum({ id: 2, alias: 'second', date: new Date('2026-01-01') }),
        mkAlbum({ id: 3, alias: 'third', date: new Date('2025-01-01') }),
      ],
    });
    fixture.detectChanges();
    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.album-card'),
    ).map(a => a.getAttribute('href') ?? '');
    expect(links[0]).toContain('/first');
    expect(links[1]).toContain('/second');
    expect(links[2]).toContain('/third');
  });

  it('rendert kein Sort-Dropdown mehr', () => {
    const { fixture } = setup({ albums: [mkAlbum()] });
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.sort-select'),
    ).toBeNull();
  });

  // ─── Pagination: Rendering ──────────────────────────────────────

  it('paginiert auf 24 Alben pro Seite', () => {
    const albums = Array.from({ length: 30 }, (_, i) =>
      mkAlbum({ id: i + 1, alias: `a-${i + 1}` }),
    );
    const { fixture } = setup({ albums });
    fixture.detectChanges();
    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('.album-card');
    expect(cards.length).toBe(24);
  });

  // ─── Pagination: URL-Sync ──────────────────────────────────────

  it('Default currentPage = 1 wenn URL keinen page-Param hat', () => {
    const { fixture } = setup({ albums: [mkAlbum()] });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      currentPage: { (): number };
    };
    expect(cmp.currentPage()).toBe(1);
  });

  it('currentPage wird aus URL-Param `?page=4` gelesen', () => {
    const albums = Array.from({ length: 100 }, (_, i) =>
      mkAlbum({ id: i + 1, alias: `a-${i + 1}` }),
    );
    const { fixture } = setup({ albums, initialPage: '4' });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      currentPage: { (): number };
    };
    expect(cmp.currentPage()).toBe(4);
  });

  it('pageAlbums zeigt die richtigen 24 Alben auf Seite 2', () => {
    const albums = Array.from({ length: 50 }, (_, i) =>
      mkAlbum({ id: i + 1, alias: `a-${i + 1}` }),
    );
    const { fixture } = setup({ albums, initialPage: '2' });
    fixture.detectChanges();
    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.album-card'),
    ).map(a => a.getAttribute('href') ?? '');
    // Seite 2 startet bei Index 24, also Album mit alias a-25
    expect(links[0]).toContain('/a-25');
    expect(links.length).toBe(24);
  });

  it('currentPage faellt auf 1 zurueck bei ungueltigem page-Param', () => {
    const { fixture } = setup({ albums: [mkAlbum()], initialPage: 'abc' });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      currentPage: { (): number };
    };
    expect(cmp.currentPage()).toBe(1);
  });

  it('currentPage clamped auf totalPages bei zu hohem page-Param', () => {
    const albums = Array.from({ length: 30 }, (_, i) =>
      mkAlbum({ id: i + 1, alias: `a-${i + 1}` }),
    );
    const { fixture } = setup({ albums, initialPage: '99' });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      currentPage: { (): number };
      totalPages: { (): number };
    };
    expect(cmp.currentPage()).toBe(cmp.totalPages());
  });

  it('currentPage = 1 bei negativem oder Null-Param', () => {
    const { fixture } = setup({ albums: [mkAlbum()], initialPage: '0' });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      currentPage: { (): number };
    };
    expect(cmp.currentPage()).toBe(1);
  });

  // ─── Pagination: Navigation ────────────────────────────────────

  it('goToPage navigiert mit page-Param + replaceUrl', () => {
    const albums = Array.from({ length: 100 }, (_, i) => mkAlbum({ id: i + 1, alias: `a-${i + 1}` }));
    const { fixture, navigateCalls } = setup({ albums });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      goToPage(p: number): void;
    };
    cmp.goToPage(4);
    expect(navigateCalls).toHaveLength(1);
    const extras = navigateCalls[0].extras as {
      queryParams: { page: number | null };
      replaceUrl: boolean;
    };
    expect(extras.queryParams.page).toBe(4);
    expect(extras.replaceUrl).toBe(true);
  });

  it('goToPage(1) entfernt den page-Param (huebsche Default-URL ohne ?page=1)', () => {
    const albums = Array.from({ length: 100 }, (_, i) => mkAlbum({ id: i + 1, alias: `a-${i + 1}` }));
    const { fixture, navigateCalls } = setup({ albums, initialPage: '3' });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      goToPage(p: number): void;
    };
    cmp.goToPage(1);
    const extras = navigateCalls[0].extras as {
      queryParams: { page: number | null };
    };
    expect(extras.queryParams.page).toBeNull();
  });

  it('next/prev navigieren entsprechend ueber URL', () => {
    const albums = Array.from({ length: 100 }, (_, i) => mkAlbum({ id: i + 1, alias: `a-${i + 1}` }));
    const { fixture, navigateCalls } = setup({ albums, initialPage: '2' });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      next(): void;
      prev(): void;
    };
    cmp.next();
    expect(
      (navigateCalls[0].extras as { queryParams: { page: number } }).queryParams.page,
    ).toBe(3);

    cmp.prev();
    // prev() von Seite 2 -> Seite 1 -> page=null (clean Default-URL)
    expect(
      (navigateCalls[1].extras as { queryParams: { page: number | null } }).queryParams.page,
    ).toBeNull();
  });

  it('goToPage clamped ungueltige Werte (0, negativ, > totalPages)', () => {
    const albums = Array.from({ length: 30 }, (_, i) => mkAlbum({ id: i + 1, alias: `a-${i + 1}` }));
    const { fixture, navigateCalls } = setup({ albums });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      goToPage(p: number): void;
      totalPages: { (): number };
    };
    const max = cmp.totalPages();
    cmp.goToPage(0);
    cmp.goToPage(999);
    cmp.goToPage(-5);
    // 0 -> 1 (entfernt Param), 999 -> max (gesetzt), -5 -> 1 (entfernt)
    expect(
      (navigateCalls[0].extras as { queryParams: { page: number | null } }).queryParams.page,
    ).toBeNull();
    expect(
      (navigateCalls[1].extras as { queryParams: { page: number | null } }).queryParams.page,
    ).toBe(max);
    expect(
      (navigateCalls[2].extras as { queryParams: { page: number | null } }).queryParams.page,
    ).toBeNull();
  });
});
