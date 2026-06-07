import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { JoomlaApiService } from './joomla-api.service';
import {
  JoomlaArticle,
  JoomlaArticleAttributes,
  JoomlaCategory,
  JoomlaCategoryAttributes,
  JoomlaResource,
} from '../models/joomla.models';
import { environment } from '../../../environments/environment';

// ─── Helpers ──────────────────────────────────────────────────────

function mkArticleAttrs(over: Partial<JoomlaArticleAttributes> = {}): JoomlaArticleAttributes {
  return {
    id: 1,
    title: 'Frage',
    alias: 'frage',
    state: 1,
    access: 1,
    created: '2026-01-01 10:00:00',
    modified: '2026-01-02 10:00:00',
    publish_up: null,
    publish_down: null,
    featured: 0,
    language: '*',
    text: '<p>Antwort</p>',
    ...over,
  };
}

function mkArticleResource(
  id: string,
  attrs: Partial<JoomlaArticleAttributes> = {},
  rel: JoomlaResource<JoomlaArticleAttributes>['relationships'] = undefined,
): JoomlaResource<JoomlaArticleAttributes> {
  return {
    type: 'article',
    id,
    attributes: mkArticleAttrs(attrs),
    relationships: rel,
  };
}

function mkCategoryAttrs(over: Partial<JoomlaCategoryAttributes> = {}): JoomlaCategoryAttributes {
  return {
    id: 10,
    title: 'Kategorie',
    alias: 'kategorie',
    published: 1,
    ...over,
  };
}

function mkCategoryResource(
  id: string,
  attrs: Partial<JoomlaCategoryAttributes> = {},
  rel: JoomlaResource<JoomlaCategoryAttributes>['relationships'] = undefined,
): JoomlaResource<JoomlaCategoryAttributes> {
  return {
    type: 'category',
    id,
    attributes: mkCategoryAttrs(attrs),
    relationships: rel,
  };
}

// ─── Tests ────────────────────────────────────────────────────────

describe('JoomlaApiService', () => {
  let service: JoomlaApiService;
  let http: HttpTestingController;
  const BASE = environment.joomlaApiBase;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), JoomlaApiService],
    });
    service = TestBed.inject(JoomlaApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  // ─── Articles ───────────────────────────────────────────────────

  it('listArticles: setzt filter[state]=1 als Default und mapped data', () => {
    let received: readonly JoomlaArticle[] | undefined;
    service.listArticles().subscribe(r => (received = r));

    const req = http.expectOne(r => r.url === `${BASE}/content/articles`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('filter[state]')).toBe('1');
    expect(req.request.params.get('filter[category]')).toBeNull();
    expect(req.request.params.get('page[limit]')).toBeNull();
    req.flush({
      data: [
        mkArticleResource('42', { title: 'Hallo' }, {
          category: { data: { type: 'category', id: '9' } },
        }),
      ],
    });

    expect(received).toHaveLength(1);
    expect(received![0].id).toBe('42');
    expect(received![0].title).toBe('Hallo');
    expect(received![0].categoryId).toBe('9');
  });

  it('listArticles: uebergibt categoryId, state, limit als Query-Params', () => {
    service.listArticles({ categoryId: 9, state: 0, limit: 50 }).subscribe();
    const req = http.expectOne(r => r.url === `${BASE}/content/articles`);
    expect(req.request.params.get('filter[category]')).toBe('9');
    expect(req.request.params.get('filter[state]')).toBe('0');
    expect(req.request.params.get('page[limit]')).toBe('50');
    req.flush({ data: [] });
  });

  it('listArticles: ohne orderBy werden keine list[*]-Params gesetzt', () => {
    service.listArticles({ categoryId: 9 }).subscribe();
    const req = http.expectOne(r => r.url === `${BASE}/content/articles`);
    expect(req.request.params.get('list[ordering]')).toBeNull();
    expect(req.request.params.get('list[direction]')).toBeNull();
    req.flush({ data: [] });
  });

  it('listArticles: orderBy triggert list[ordering] + list[direction] (default asc)', () => {
    service
      .listArticles({ categoryId: 13, orderBy: 'ordering' })
      .subscribe();
    const req = http.expectOne(r => r.url === `${BASE}/content/articles`);
    expect(req.request.params.get('list[ordering]')).toBe('ordering');
    expect(req.request.params.get('list[direction]')).toBe('asc');
    req.flush({ data: [] });
  });

  it('listArticles: orderDirection desc wird mitgesendet', () => {
    service
      .listArticles({ orderBy: 'created', orderDirection: 'desc' })
      .subscribe();
    const req = http.expectOne(r => r.url === `${BASE}/content/articles`);
    expect(req.request.params.get('list[ordering]')).toBe('created');
    expect(req.request.params.get('list[direction]')).toBe('desc');
    req.flush({ data: [] });
  });

  it('listArticles: leeres data array -> leere Liste', () => {
    let received: readonly JoomlaArticle[] | undefined;
    service.listArticles().subscribe(r => (received = r));
    http.expectOne(r => r.url === `${BASE}/content/articles`).flush({ data: [] });
    expect(received).toEqual([]);
  });

  it('listArticles: mapped tagIds aus relationships.tags', () => {
    let received: readonly JoomlaArticle[] | undefined;
    service.listArticles().subscribe(r => (received = r));
    http.expectOne(r => r.url === `${BASE}/content/articles`).flush({
      data: [
        mkArticleResource('1', {}, {
          tags: {
            data: [
              { type: 'tag', id: '5' },
              { type: 'tag', id: '7' },
            ],
          },
        }),
      ],
    });
    expect(received![0].tagIds).toEqual(['5', '7']);
  });

  it('listArticles: kein category-Relationship -> categoryId leer', () => {
    let received: readonly JoomlaArticle[] | undefined;
    service.listArticles().subscribe(r => (received = r));
    http.expectOne(r => r.url === `${BASE}/content/articles`).flush({
      data: [mkArticleResource('1')],
    });
    expect(received![0].categoryId).toBe('');
  });

  it('listArticles: setzt X-Joomla-Token Header wenn Token konfiguriert', () => {
    service.listArticles().subscribe();
    const req = http.expectOne(r => r.url === `${BASE}/content/articles`);
    if (environment.joomlaToken) {
      expect(req.request.headers.get('X-Joomla-Token')).toBe(environment.joomlaToken);
    }
    req.flush({ data: [] });
  });

  it('getArticle: GET /content/articles/:id mapped resource', () => {
    let received: JoomlaArticle | null | undefined;
    service.getArticle(42).subscribe(r => (received = r));
    const req = http.expectOne(`${BASE}/content/articles/42`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: mkArticleResource('42', { title: 'Detail' }) });
    expect(received?.id).toBe('42');
    expect(received?.title).toBe('Detail');
  });

  it('getArticle: data null -> liefert null', () => {
    let received: JoomlaArticle | null | undefined = undefined;
    service.getArticle(42).subscribe(r => (received = r));
    http.expectOne(`${BASE}/content/articles/42`).flush({ data: null });
    expect(received).toBeNull();
  });

  it('getArticle: encodeURIComponent fuer ID', () => {
    service.getArticle('a/b').subscribe();
    const req = http.expectOne(`${BASE}/content/articles/a%2Fb`);
    req.flush({ data: null });
  });

  // ─── Categories ─────────────────────────────────────────────────

  it('listCategories: GET /content/categories mapped', () => {
    let received: readonly JoomlaCategory[] | undefined;
    service.listCategories().subscribe(r => (received = r));
    const req = http.expectOne(`${BASE}/content/categories`);
    req.flush({
      data: [
        mkCategoryResource('9', { title: 'FAQ', parent_id: 1 }),
        mkCategoryResource('11', { title: 'Anmeldung', parent_id: 9 }),
      ],
    });
    expect(received).toHaveLength(2);
    expect(received![0].id).toBe('9');
    expect(received![0].parent_id).toBe('1');
    expect(received![1].parent_id).toBe('9');
  });

  it('listCategories: parent_id aus relationships hat Vorrang vor attribute', () => {
    let received: readonly JoomlaCategory[] | undefined;
    service.listCategories().subscribe(r => (received = r));
    http.expectOne(`${BASE}/content/categories`).flush({
      data: [
        mkCategoryResource(
          '11',
          { parent_id: 9 },
          { parent: { data: { type: 'category', id: '42' } } },
        ),
      ],
    });
    // Relationship gewinnt
    expect(received![0].parent_id).toBe('42');
  });

  it('getCategory: GET /content/categories/:id mapped', () => {
    let received: JoomlaCategory | null | undefined;
    service.getCategory(9).subscribe(r => (received = r));
    http.expectOne(`${BASE}/content/categories/9`).flush({
      data: mkCategoryResource('9', { title: 'FAQ' }),
    });
    expect(received?.id).toBe('9');
    expect(received?.title).toBe('FAQ');
  });

  it('getCategory: data null -> null', () => {
    let received: JoomlaCategory | null | undefined = undefined;
    service.getCategory(9).subscribe(r => (received = r));
    http.expectOne(`${BASE}/content/categories/9`).flush({ data: null });
    expect(received).toBeNull();
  });
});
