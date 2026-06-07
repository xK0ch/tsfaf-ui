import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Neuigkeiten } from './neuigkeiten';
import { NewsStore, type NewsArticle } from './neuigkeiten-data';

// ─── Helpers ──────────────────────────────────────────────────────

function mkArticle(over: Partial<NewsArticle> = {}): NewsArticle {
  return {
    id: '1',
    slug: 'foo',
    title: 'Foo',
    date: new Date('2026-01-01T00:00:00Z'),
    dateLong: '01. Januar 2026',
    dateShort: 'Jan 26',
    excerpt: 'Excerpt',
    bodyHtml: '<p>Body</p>',
    imageUrl: null,
    imageAlt: 'Foo',
    imageCaption: null,
    ...over,
  };
}

function makeStoreMock(initial: readonly NewsArticle[] | null) {
  const articles = signal<readonly NewsArticle[] | null>(initial);
  return {
    articles,
    loading: computed(() => articles() === null),
    bySlug: (slug: string) =>
      articles()?.find(a => a.slug === slug) ?? null,
  };
}

// ─── Tests ────────────────────────────────────────────────────────

describe('Neuigkeiten', () => {
  function setup(articles: readonly NewsArticle[] | null) {
    const storeMock = makeStoreMock(articles);
    TestBed.configureTestingModule({
      imports: [Neuigkeiten],
      providers: [
        provideRouter([]),
        { provide: NewsStore, useValue: storeMock },
      ],
    });
    const fixture = TestBed.createComponent(Neuigkeiten);
    return { fixture, storeMock };
  }

  // ─── Loading / Empty State ──────────────────────────────────────

  it('zeigt Loading-Hinweis wenn Store noch laedt (articles = null)', () => {
    const { fixture } = setup(null);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Wird geladen');
    expect(el.querySelector('.news-grid')).toBeNull();
  });

  it('zeigt Empty-State wenn keine Artikel da sind', () => {
    const { fixture } = setup([]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('keine Beiträge online');
    expect(el.querySelector('.news-grid')).toBeNull();
  });

  // ─── Pagination + Featured ──────────────────────────────────────

  it('zeigt alle Artikel wenn weniger als die Page-Size existieren', () => {
    const { fixture } = setup([
      mkArticle({ id: '1', slug: 'a' }),
      mkArticle({ id: '2', slug: 'b' }),
    ]);
    fixture.detectChanges();
    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('.news-card');
    expect(cards.length).toBe(2);
  });

  it('markiert die erste Karte als featured (auf Seite 1)', () => {
    const { fixture } = setup([
      mkArticle({ id: '1', slug: 'a' }),
      mkArticle({ id: '2', slug: 'b' }),
    ]);
    fixture.detectChanges();
    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('.news-card');
    expect(cards[0].classList.contains('news-card-featured')).toBe(true);
    expect(cards[1].classList.contains('news-card-featured')).toBe(false);
  });

  it('paginiert: zeigt nur die ersten 6 Artikel auf Seite 1', () => {
    const articles = Array.from({ length: 10 }, (_, i) =>
      mkArticle({ id: String(i + 1), slug: `a-${i + 1}` }),
    );
    const { fixture } = setup(articles);
    fixture.detectChanges();
    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('.news-card');
    expect(cards.length).toBe(6);
  });

  it('zeigt Pagination-Buttons wenn mehr als eine Seite', () => {
    const articles = Array.from({ length: 10 }, (_, i) =>
      mkArticle({ id: String(i + 1), slug: `a-${i + 1}` }),
    );
    const { fixture } = setup(articles);
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.pagination .page-btn').length,
    ).toBeGreaterThan(0);
  });

  it('Featured wird auf Seite 2 NICHT mehr gesetzt', () => {
    const articles = Array.from({ length: 10 }, (_, i) =>
      mkArticle({ id: String(i + 1), slug: `a-${i + 1}` }),
    );
    const { fixture } = setup(articles);
    fixture.detectChanges();

    const cmp = fixture.componentInstance as unknown as {
      next(): void;
      currentPage: { (): number };
    };
    cmp.next();
    fixture.detectChanges();
    expect(cmp.currentPage()).toBe(2);

    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('.news-card');
    cards.forEach(c => expect(c.classList.contains('news-card-featured')).toBe(false));
  });

  it('goToPage klemmt ungueltige Werte', () => {
    const articles = Array.from({ length: 10 }, (_, i) =>
      mkArticle({ id: String(i + 1), slug: `a-${i + 1}` }),
    );
    const { fixture } = setup(articles);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      goToPage(p: number): void;
      currentPage: { (): number };
      totalPages: { (): number };
    };
    cmp.goToPage(0);
    expect(cmp.currentPage()).toBe(1);
    cmp.goToPage(999);
    expect(cmp.currentPage()).toBe(1);
    cmp.goToPage(cmp.totalPages());
    expect(cmp.currentPage()).toBe(cmp.totalPages());
  });

  // ─── Bild-Rendering ─────────────────────────────────────────────

  it('rendert <img> wenn imageUrl gesetzt ist', () => {
    const { fixture } = setup([
      mkArticle({ imageUrl: 'https://example.com/foo.jpg', imageAlt: 'Alt' }),
    ]);
    fixture.detectChanges();
    const img = (fixture.nativeElement as HTMLElement).querySelector('.news-card-image') as HTMLImageElement | null;
    expect(img).not.toBeNull();
    expect(img!.src).toBe('https://example.com/foo.jpg');
    expect(img!.alt).toBe('Alt');
  });

  it('rendert app-news-cover Fallback wenn imageUrl null', () => {
    const { fixture } = setup([mkArticle({ imageUrl: null })]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-news-cover')).not.toBeNull();
    expect(el.querySelector('.news-card-image')).toBeNull();
  });
});
