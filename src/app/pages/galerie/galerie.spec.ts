import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

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

describe('Galerie', () => {
  function setup(albums: readonly Album[] | null = []) {
    TestBed.configureTestingModule({
      imports: [Galerie],
      providers: [
        provideRouter([]),
        { provide: GalleryStore, useValue: makeStoreMock(albums) },
      ],
    });
    return TestBed.createComponent(Galerie);
  }

  // ─── Loading / Empty ────────────────────────────────────────────

  it('zeigt Loading-Status solange Store laedt', () => {
    const fixture = setup(null);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.gallery-status')?.textContent).toContain(
      'Alben werden geladen',
    );
    expect(el.querySelector('.album-grid')).toBeNull();
  });

  it('zeigt Empty-State wenn keine Alben da sind', () => {
    const fixture = setup([]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.gallery-status')?.textContent).toContain(
      'keine Alben hinterlegt',
    );
  });

  // ─── Rendering ──────────────────────────────────────────────────

  it('rendert ein Album-Card pro Album', () => {
    const fixture = setup([
      mkAlbum({ id: 1, alias: 'a' }),
      mkAlbum({ id: 2, alias: 'b' }),
      mkAlbum({ id: 3, alias: 'c' }),
    ]);
    fixture.detectChanges();
    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('.album-card');
    expect(cards.length).toBe(3);
  });

  it('Album-Card verlinkt auf /galerie/<alias>', () => {
    const fixture = setup([
      mkAlbum({ id: 1, alias: 'tanz-in-den-mai-2026', title: 'Tanz' }),
    ]);
    fixture.detectChanges();
    const link = (fixture.nativeElement as HTMLElement).querySelector(
      '.album-card',
    ) as HTMLAnchorElement | null;
    expect(link?.getAttribute('href')).toContain('/galerie/tanz-in-den-mai-2026');
  });

  it('zeigt imageCount + dateShort in der Card', () => {
    const fixture = setup([
      mkAlbum({ imageCount: 42, dateShort: 'Juni 2026' }),
    ]);
    fixture.detectChanges();
    const meta = (fixture.nativeElement as HTMLElement).querySelector('.album-meta')?.textContent ?? '';
    expect(meta).toContain('42');
    expect(meta).toContain('Juni 2026');
  });

  // ─── Reihenfolge: API-Order respektieren ────────────────────────

  it('respektiert die API-Reihenfolge (Drag&Drop im Backend, kein client-seitiges Re-Sort)', () => {
    const fixture = setup([
      mkAlbum({ id: 1, alias: 'first', date: new Date('2024-01-01') }),
      mkAlbum({ id: 2, alias: 'second', date: new Date('2026-01-01') }),
      mkAlbum({ id: 3, alias: 'third', date: new Date('2025-01-01') }),
    ]);
    fixture.detectChanges();
    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.album-card'),
    ).map(a => a.getAttribute('href') ?? '');
    // Trotz wildem Datum: Reihenfolge bleibt 1, 2, 3 wie sie reinkam.
    expect(links[0]).toContain('/first');
    expect(links[1]).toContain('/second');
    expect(links[2]).toContain('/third');
  });

  it('rendert kein Sort-Dropdown mehr', () => {
    const fixture = setup([mkAlbum()]);
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.sort-select'),
    ).toBeNull();
  });

  // ─── Pagination ─────────────────────────────────────────────────

  it('paginiert auf 24 Alben pro Seite', () => {
    const albums = Array.from({ length: 30 }, (_, i) =>
      mkAlbum({ id: i + 1, alias: `a-${i + 1}`, date: new Date(`202${i % 5 + 4}-01-01`) }),
    );
    const fixture = setup(albums);
    fixture.detectChanges();
    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('.album-card');
    expect(cards.length).toBe(24);
  });
});
