import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { NeuigkeitenDetail } from './neuigkeiten-detail';
import { NewsStore, type NewsArticle } from '../neuigkeiten-data';

function mkArticle(over: Partial<NewsArticle> = {}): NewsArticle {
  return {
    id: '1',
    slug: 'parken',
    title: 'Parken in Neumuenster',
    date: new Date('2026-01-01T00:00:00Z'),
    dateLong: '01. Januar 2026',
    dateShort: 'Jan 26',
    excerpt: 'Excerpt',
    bodyHtml: '<p>Body</p>',
    imageUrl: null,
    imageAlt: 'Parken',
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

function makeRouteWithSlug(slug: string): ActivatedRoute {
  return {
    paramMap: of(convertToParamMap({ slug })),
  } as unknown as ActivatedRoute;
}

describe('NeuigkeitenDetail', () => {
  function setup(opts: {
    slug: string;
    articles: readonly NewsArticle[] | null;
  }) {
    const storeMock = makeStoreMock(opts.articles);
    // RouterLinkActive in der NewsSidebar abonniert router.events, also
    // muss unser Router-Mock die Eventquelle haben. Wir nutzen ansonsten
    // nur navigate.
    const routerSpy = {
      navigate: jasmineLikeSpy<unknown[]>(),
      events: of(),
      createUrlTree: () => null,
      serializeUrl: () => '',
    };
    TestBed.configureTestingModule({
      imports: [NeuigkeitenDetail],
      providers: [
        provideRouter([]),
        { provide: NewsStore, useValue: storeMock },
        { provide: ActivatedRoute, useValue: makeRouteWithSlug(opts.slug) },
        { provide: Router, useValue: routerSpy },
      ],
    });
    const fixture = TestBed.createComponent(NeuigkeitenDetail);
    return { fixture, storeMock, routerSpy };
  }

  it('zeigt Loading-Status solange Store laedt', () => {
    const { fixture } = setup({ slug: 'parken', articles: null });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Wird geladen');
  });

  it('rendert Artikel wenn vorhanden', () => {
    const { fixture } = setup({
      slug: 'parken',
      articles: [mkArticle({ slug: 'parken', title: 'Parken in Neumuenster' })],
    });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.detail-title')?.textContent).toContain(
      'Parken in Neumuenster',
    );
  });

  it('rendert Hero-Image wenn imageUrl gesetzt', () => {
    const { fixture } = setup({
      slug: 'parken',
      articles: [
        mkArticle({
          slug: 'parken',
          imageUrl: 'https://example.com/p.jpg',
          imageAlt: 'Parkbild',
        }),
      ],
    });
    fixture.detectChanges();
    const img = (fixture.nativeElement as HTMLElement).querySelector(
      '.detail-cover-image',
    ) as HTMLImageElement | null;
    expect(img).not.toBeNull();
    expect(img!.alt).toBe('Parkbild');
  });

  it('faellt auf SVG-Cover zurueck wenn imageUrl null', () => {
    const { fixture } = setup({
      slug: 'parken',
      articles: [mkArticle({ slug: 'parken', imageUrl: null })],
    });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-news-cover')).not.toBeNull();
    expect(el.querySelector('.detail-cover-image')).toBeNull();
  });

  it('zeigt Image-Caption wenn vorhanden', () => {
    const { fixture } = setup({
      slug: 'parken',
      articles: [
        mkArticle({
          slug: 'parken',
          imageUrl: 'https://example.com/p.jpg',
          imageCaption: 'Foto: Max Mustermann',
        }),
      ],
    });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const caption = el.querySelector('.detail-cover-caption');
    expect(caption?.textContent).toContain('Foto: Max Mustermann');
  });

  it('rendert BodyHtml in den Detail-Body', () => {
    const { fixture } = setup({
      slug: 'parken',
      articles: [
        mkArticle({
          slug: 'parken',
          bodyHtml: '<p>Hallo <strong>Welt</strong></p>',
        }),
      ],
    });
    fixture.detectChanges();
    const body = (fixture.nativeElement as HTMLElement).querySelector('.detail-body');
    expect(body?.innerHTML).toContain('<strong>Welt</strong>');
  });

  it('navigiert zur Uebersicht wenn Artikel zu Slug nicht existiert', () => {
    const { fixture, routerSpy } = setup({
      slug: 'nope',
      articles: [mkArticle({ slug: 'parken' })],
    });
    fixture.detectChanges();
    expect(routerSpy.navigate.calls.length).toBeGreaterThan(0);
    expect(routerSpy.navigate.calls[0]?.[0]).toEqual(['/neuigkeiten']);
  });

  it('navigiert NICHT solange noch geladen wird', () => {
    const { fixture, routerSpy } = setup({ slug: 'nope', articles: null });
    fixture.detectChanges();
    expect(routerSpy.navigate.calls.length).toBe(0);
  });
});

// ─── Tiny spy helper to avoid pulling in jasmine globals ─────────

interface SpyCalls<T extends unknown[]> {
  calls: ReadonlyArray<T>;
  (...args: T): void;
}

function jasmineLikeSpy<T extends unknown[]>(): SpyCalls<T> {
  const recorded: T[] = [];
  const fn = ((...args: T) => {
    recorded.push(args);
  }) as SpyCalls<T>;
  Object.defineProperty(fn, 'calls', {
    get: () => recorded,
  });
  return fn;
}
