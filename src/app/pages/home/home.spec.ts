import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Home } from './home';
import { NewsStore, type NewsArticle } from '../neuigkeiten/neuigkeiten-data';

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
    bySlug: () => null,
  };
}

describe('Home', () => {
  function setup(articles: readonly NewsArticle[] | null) {
    TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        { provide: NewsStore, useValue: makeStoreMock(articles) },
      ],
    });
    return TestBed.createComponent(Home);
  }

  it('zeigt Loading-Hinweis solange NewsStore laedt', () => {
    const fixture = setup(null);
    fixture.detectChanges();
    const news = (fixture.nativeElement as HTMLElement).querySelector('.section-news');
    expect(news?.textContent).toContain('Wird geladen');
  });

  it('zeigt Empty-State wenn keine Artikel da sind', () => {
    const fixture = setup([]);
    fixture.detectChanges();
    const news = (fixture.nativeElement as HTMLElement).querySelector('.section-news');
    expect(news?.textContent).toContain('keine Beiträge online');
  });

  it('zeigt maximal 3 News-Cards auf der Home', () => {
    const fixture = setup(
      Array.from({ length: 8 }, (_, i) =>
        mkArticle({ id: String(i + 1), slug: `n-${i + 1}`, title: `News ${i + 1}` }),
      ),
    );
    fixture.detectChanges();
    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('.section-news .news-card');
    expect(cards.length).toBe(3);
  });

  it('verlinkt jede Home-News-Card direkt auf die Detail-Page (slug)', () => {
    const fixture = setup([
      mkArticle({ id: '1', slug: 'parken', title: 'Parken' }),
    ]);
    fixture.detectChanges();
    const link = (fixture.nativeElement as HTMLElement).querySelector(
      '.section-news .news-card',
    ) as HTMLAnchorElement | null;
    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toContain('/neuigkeiten/parken');
  });

  it('Gutschein-Band-Section wurde komplett entfernt', () => {
    const fixture = setup([]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.section-gutschein')).toBeNull();
    expect(el.querySelector('.gutschein-inner')).toBeNull();
  });

  it('News-Section steht im DOM direkt nach Hero (vor Zielgruppen)', () => {
    const fixture = setup([mkArticle()]);
    fixture.detectChanges();
    const sections = (fixture.nativeElement as HTMLElement).querySelectorAll('section');
    // [0] Hero, [1] News, [2] Zielgruppen
    expect(sections[1]?.classList.contains('section-news')).toBe(true);
    expect(sections[2]?.classList.contains('section-zielgruppen')).toBe(true);
  });
});
