import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { mapNewsArticle, NewsStore } from './neuigkeiten-data';
import type { JoomlaArticle } from '../../core/models/joomla.models';
import { environment } from '../../../environments/environment';

// ─── Helpers ──────────────────────────────────────────────────────

function mkJoomlaArticle(over: Partial<JoomlaArticle> = {}): JoomlaArticle {
  return {
    id: '1',
    title: 'Titel',
    alias: 'titel',
    state: 1,
    text: '<p>Body</p>',
    created: '2026-01-01 10:00:00',
    modified: '2026-01-01 10:00:00',
    publish_up: null,
    publish_down: null,
    language: '*',
    featured: 0,
    images: {},
    categoryId: '8',
    tagIds: [],
    ...over,
  };
}

// ─── mapNewsArticle ───────────────────────────────────────────────

describe('mapNewsArticle', () => {
  it('mapped Standardfelder', () => {
    const a = mapNewsArticle(
      mkJoomlaArticle({ id: '42', title: 'Hallo', alias: 'hallo' }),
    );
    expect(a.id).toBe('42');
    expect(a.slug).toBe('hallo');
    expect(a.title).toBe('Hallo');
  });

  it('faellt auf "news-<id>" zurueck wenn alias leer', () => {
    const a = mapNewsArticle(mkJoomlaArticle({ id: '99', alias: '' }));
    expect(a.slug).toBe('news-99');
  });

  it('bevorzugt publish_up vor created beim Datum', () => {
    const a = mapNewsArticle(
      mkJoomlaArticle({
        created: '2026-01-01 10:00:00',
        publish_up: '2026-06-15 10:00:00',
      }),
    );
    expect(a.date.getFullYear()).toBe(2026);
    expect(a.date.getMonth()).toBe(5); // Juni
  });

  it('faellt auf created zurueck wenn publish_up null', () => {
    const a = mapNewsArticle(
      mkJoomlaArticle({
        created: '2026-03-15 10:00:00',
        publish_up: null,
      }),
    );
    expect(a.date.getMonth()).toBe(2); // Maerz
  });

  it('dateLong + dateShort sind in de-DE lokalisiert', () => {
    const a = mapNewsArticle(
      mkJoomlaArticle({ created: '2026-09-10 00:00:00', publish_up: null }),
    );
    expect(a.dateLong).toMatch(/10\.?\s*September\s*2026/);
    expect(a.dateShort.toLowerCase()).toContain('sep');
  });

  it('strippt #joomlaImage-Suffix und macht absolute URL', () => {
    const a = mapNewsArticle(
      mkJoomlaArticle({
        images: {
          image_intro:
            'images/blog_bilder/foo.jpg#joomlaImage://local-images/blog_bilder/foo.jpg?width=1200',
        },
      }),
    );
    expect(a.imageUrl).toBe(`${environment.joomlaImageBase}/images/blog_bilder/foo.jpg`);
  });

  it('akzeptiert absolute URLs unveraendert', () => {
    const a = mapNewsArticle(
      mkJoomlaArticle({
        images: { image_intro: 'https://cdn.example.com/foo.jpg' },
      }),
    );
    expect(a.imageUrl).toBe('https://cdn.example.com/foo.jpg');
  });

  it('imageUrl null wenn kein Bild gepflegt', () => {
    const a = mapNewsArticle(mkJoomlaArticle());
    expect(a.imageUrl).toBeNull();
  });

  it('imageAlt aus image_intro_alt, sonst Title als Fallback', () => {
    const explicit = mapNewsArticle(
      mkJoomlaArticle({
        title: 'Titel',
        images: { image_intro: 'images/x.jpg', image_intro_alt: 'Mein Alt' },
      }),
    );
    expect(explicit.imageAlt).toBe('Mein Alt');

    const fallback = mapNewsArticle(
      mkJoomlaArticle({
        title: 'Titel',
        images: { image_intro: 'images/x.jpg' },
      }),
    );
    expect(fallback.imageAlt).toBe('Titel');
  });

  it('imageCaption null bei leerem oder Whitespace-String', () => {
    const blank = mapNewsArticle(
      mkJoomlaArticle({
        images: { image_intro: 'x.jpg', image_intro_caption: '   ' },
      }),
    );
    expect(blank.imageCaption).toBeNull();

    const filled = mapNewsArticle(
      mkJoomlaArticle({
        images: { image_intro: 'x.jpg', image_intro_caption: 'Foto: Max' },
      }),
    );
    expect(filled.imageCaption).toBe('Foto: Max');
  });

  it('Excerpt aus metadesc bevorzugt', () => {
    const j = mkJoomlaArticle({ text: '<p>Body</p>' });
    (j as Record<string, unknown>)['metadesc'] = 'Mein Teaser';
    const a = mapNewsArticle(j);
    expect(a.excerpt).toBe('Mein Teaser');
  });

  it('Excerpt aus Body wenn metadesc leer, mit gestrippten Tags', () => {
    const a = mapNewsArticle(
      mkJoomlaArticle({
        text: '<p>Hallo <strong>Welt</strong>!</p>',
      }),
    );
    expect(a.excerpt).not.toContain('<');
    expect(a.excerpt).toContain('Hallo');
    expect(a.excerpt).toContain('Welt');
  });

  it('Excerpt bei langem Body wird truncated und endet mit Ellipsis', () => {
    const longText = '<p>' + 'word '.repeat(200) + '</p>';
    const a = mapNewsArticle(mkJoomlaArticle({ text: longText }));
    expect(a.excerpt.length).toBeLessThanOrEqual(165);
    expect(a.excerpt).toMatch(/…$/);
  });
});

// ─── NewsStore ────────────────────────────────────────────────────

describe('NewsStore', () => {
  let http: HttpTestingController;
  const BASE = environment.joomlaApiBase;

  function setupStore(): NewsStore {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        NewsStore,
      ],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(NewsStore);
  }

  afterEach(() => {
    http.verify();
  });

  function flushArticles(payload: { data: unknown[] }): void {
    const req = http.expectOne(r => r.url === `${BASE}/content/articles`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('filter[category]')).toBe(
      String(environment.joomlaCategoryNews),
    );
    req.flush(payload as object);
  }

  function mkResource(id: string, attrs: Partial<JoomlaArticle> = {}) {
    return {
      type: 'article',
      id,
      attributes: {
        id: Number(id),
        title: 'T',
        alias: `a-${id}`,
        state: 1,
        access: 1,
        created: '2026-01-01 10:00:00',
        modified: '2026-01-01 10:00:00',
        publish_up: null,
        publish_down: null,
        featured: 0,
        language: '*',
        text: '',
        ...attrs,
      },
    };
  }

  it('loading() ist vor dem Flush true, danach false', () => {
    const store = setupStore();
    expect(store.loading()).toBe(true);
    flushArticles({ data: [] });
    expect(store.loading()).toBe(false);
  });

  it('articles ist nach Flush leeres Array wenn data leer', () => {
    const store = setupStore();
    flushArticles({ data: [] });
    expect(store.articles()).toEqual([]);
  });

  it('sortiert Artikel nach Datum absteigend', () => {
    const store = setupStore();
    flushArticles({
      data: [
        mkResource('1', {
          title: 'Alt',
          alias: 'alt',
          created: '2026-01-01 10:00:00',
        }),
        mkResource('2', {
          title: 'Neu',
          alias: 'neu',
          created: '2026-06-01 10:00:00',
        }),
        mkResource('3', {
          title: 'Mitte',
          alias: 'mitte',
          created: '2026-03-01 10:00:00',
        }),
      ],
    });
    expect(store.articles()?.map(a => a.slug)).toEqual(['neu', 'mitte', 'alt']);
  });

  it('bySlug liefert null waehrend des Ladens', () => {
    const store = setupStore();
    expect(store.bySlug('x')).toBeNull();
    flushArticles({ data: [] });
  });

  it('bySlug liefert Artikel wenn gefunden, sonst null', () => {
    const store = setupStore();
    flushArticles({
      data: [mkResource('1', { title: 'X', alias: 'x' })],
    });
    expect(store.bySlug('x')?.title).toBe('X');
    expect(store.bySlug('nope')).toBeNull();
  });
});
