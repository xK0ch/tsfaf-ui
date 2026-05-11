import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { Faq } from './faq';
import { JoomlaApiService } from '../../core/services/joomla-api.service';
import type { JoomlaArticle, JoomlaCategory } from '../../core/models/joomla.models';

// ─── Helpers ──────────────────────────────────────────────────────

function mkArticle(over: Partial<JoomlaArticle> = {}): JoomlaArticle {
  return {
    id: '1',
    title: 'Frage',
    alias: 'frage',
    state: 1,
    text: '<p>Antwort</p>',
    created: '',
    modified: '',
    publish_up: null,
    publish_down: null,
    language: '*',
    featured: 0,
    images: {},
    categoryId: '9',
    tagIds: [],
    ...over,
  };
}

function mkCategory(over: Partial<JoomlaCategory> = {}): JoomlaCategory {
  return {
    id: '11',
    title: 'Anmeldung',
    alias: 'anmeldung',
    published: 1,
    parent_id: '9',
    ...over,
  };
}

interface FaqCmp {
  query: { (): string; set(v: string): void };
  activeCategory: { (): string; set(v: string): void };
  openId: { (): string | null };
  faqGroups: { (): readonly { category: string; items: readonly unknown[] }[] | null };
  loading: { (): boolean };
  totalItemCount: { (): number };
  categories: { (): readonly { name: string; count: number }[] };
  filteredGroups: {
    (): readonly {
      category: string;
      items: readonly { id: string; questionHtml: string; answerHtml: string }[];
    }[];
  };
  totalVisible: { (): number };
  hasResults: { (): boolean };
  showSectionTitles: { (): boolean };
  allCategoryName: string;
  onQueryInput(v: string): void;
  selectCategory(name: string): void;
  toggleItem(id: string): void;
}

describe('Faq', () => {
  function setup(opts: {
    subcategories?: readonly JoomlaCategory[];
    articlesByCat?: Record<string, readonly JoomlaArticle[]>;
    articlesForParent?: readonly JoomlaArticle[];
  } = {}) {
    const subcategories = opts.subcategories ?? [];
    const articlesByCat = opts.articlesByCat ?? {};
    const articlesForParent = opts.articlesForParent ?? [];

    const apiMock = {
      listSubcategories: () => of(subcategories),
      listArticles: (args: { categoryId: string | number }) => {
        const key = String(args.categoryId);
        if (subcategories.length === 0) {
          return of(articlesForParent);
        }
        return of(articlesByCat[key] ?? []);
      },
    };

    TestBed.configureTestingModule({
      imports: [Faq],
      providers: [provideRouter([]), { provide: JoomlaApiService, useValue: apiMock }],
    });
    const fixture = TestBed.createComponent(Faq);
    return { fixture, apiMock };
  }

  // ─── Datenfluss ────────────────────────────────────────────────

  it('faellt auf "Allgemein"-Gruppe zurueck wenn keine Sub-Kategorien existieren', () => {
    const { fixture } = setup({
      subcategories: [],
      articlesForParent: [
        mkArticle({ id: '1', title: 'Parken?', alias: 'parken', text: '<p>Genug Plaetze.</p>' }),
      ],
    });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    const groups = cmp.faqGroups();
    expect(groups).not.toBeNull();
    expect(groups).toHaveLength(1);
    expect(groups![0].category).toBe('Allgemein');
    expect(groups![0].items).toHaveLength(1);
  });

  it('baut pro Sub-Kategorie eine Gruppe und filtert leere weg', () => {
    const { fixture } = setup({
      subcategories: [
        mkCategory({ id: '11', title: 'Anmeldung' }),
        mkCategory({ id: '12', title: 'Praktisches' }),
        mkCategory({ id: '13', title: 'Leer' }),
      ],
      articlesByCat: {
        '11': [mkArticle({ id: '1', title: 'Wie melde ich mich an?', alias: 'anmelden' })],
        '12': [
          mkArticle({ id: '2', title: 'Parken?', alias: 'parken' }),
          mkArticle({ id: '3', title: 'Schuhe?', alias: 'schuhe' }),
        ],
        '13': [],
      },
    });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    const groups = cmp.faqGroups();
    expect(groups).toHaveLength(2);
    expect(groups!.map(g => g.category)).toEqual(['Anmeldung', 'Praktisches']);
    expect(groups![1].items).toHaveLength(2);
  });

  it('faellt auf "faq-<id>" ID zurueck wenn alias leer ist', () => {
    const { fixture } = setup({
      subcategories: [mkCategory({ id: '11', title: 'X' })],
      articlesByCat: {
        '11': [mkArticle({ id: '99', alias: '' })],
      },
    });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    const groups = cmp.faqGroups();
    expect(groups![0].items[0]).toMatchObject({ id: 'faq-99' });
  });

  // ─── Loading ────────────────────────────────────────────────────

  it('loading ist false sobald die API synchron geliefert hat', () => {
    // Mit `of(...)` ist die Pipe synchron: das field-init von toSignal
    // subscribet sofort, also liegt der Wert bereits vor dem ersten
    // detectChanges. loading() ist dann false.
    const { fixture } = setup({ subcategories: [], articlesForParent: [] });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    expect(cmp.loading()).toBe(false);
    expect(cmp.faqGroups()).not.toBeNull();
  });

  // ─── Kategorien-Sidebar ────────────────────────────────────────

  it('categories enthaelt Alle + jede Gruppe mit korrektem Count', () => {
    const { fixture } = setup({
      subcategories: [mkCategory({ id: '11', title: 'A' }), mkCategory({ id: '12', title: 'B' })],
      articlesByCat: {
        '11': [mkArticle({ id: '1' }), mkArticle({ id: '2' })],
        '12': [mkArticle({ id: '3' })],
      },
    });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    const cats = cmp.categories();
    expect(cats).toEqual([
      { name: 'Alle', count: 3 },
      { name: 'A', count: 2 },
      { name: 'B', count: 1 },
    ]);
  });

  it('totalItemCount summiert alle Items ueber alle Gruppen', () => {
    const { fixture } = setup({
      subcategories: [mkCategory({ id: '11', title: 'A' })],
      articlesByCat: {
        '11': [mkArticle({ id: '1' }), mkArticle({ id: '2' })],
      },
    });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    expect(cmp.totalItemCount()).toBe(2);
  });

  // ─── Filter: Kategorie ──────────────────────────────────────────

  it('selectCategory: setzt activeCategory und leert query', () => {
    const { fixture } = setup({
      subcategories: [mkCategory({ id: '11', title: 'A' }), mkCategory({ id: '12', title: 'B' })],
      articlesByCat: {
        '11': [mkArticle({ id: '1' })],
        '12': [mkArticle({ id: '2' })],
      },
    });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    cmp.onQueryInput('parken');
    cmp.selectCategory('B');
    expect(cmp.activeCategory()).toBe('B');
    expect(cmp.query()).toBe('');
  });

  it('filteredGroups: nur aktive Kategorie wenn nicht "Alle"', () => {
    const { fixture } = setup({
      subcategories: [mkCategory({ id: '11', title: 'A' }), mkCategory({ id: '12', title: 'B' })],
      articlesByCat: {
        '11': [mkArticle({ id: '1' })],
        '12': [mkArticle({ id: '2' })],
      },
    });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    cmp.selectCategory('B');
    expect(cmp.filteredGroups()).toHaveLength(1);
    expect(cmp.filteredGroups()[0].category).toBe('B');
  });

  // ─── Filter: Such-Query ────────────────────────────────────────

  it('onQueryInput: aktiviert "Alle" sobald gesucht wird', () => {
    const { fixture } = setup({
      subcategories: [mkCategory({ id: '11', title: 'A' })],
      articlesByCat: { '11': [mkArticle({ id: '1' })] },
    });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    cmp.selectCategory('A');
    cmp.onQueryInput('parken');
    expect(cmp.activeCategory()).toBe('Alle');
    expect(cmp.query()).toBe('parken');
  });

  it('filteredGroups: filtert Items per Volltext (q + a, case-insensitive)', () => {
    const { fixture } = setup({
      subcategories: [mkCategory({ id: '11', title: 'A' })],
      articlesByCat: {
        '11': [
          mkArticle({ id: '1', alias: 'parken', title: 'Wo Parken?', text: '<p>Parkplaetze sind kostenlos.</p>' }),
          mkArticle({ id: '2', alias: 'schuhe', title: 'Schuhe?', text: '<p>Tanzschuhe oder saubere Sohlen.</p>' }),
        ],
      },
    });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    cmp.onQueryInput('PARK');
    const groups = cmp.filteredGroups();
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(1);
    expect(groups[0].items[0].id).toBe('parken');
  });

  it('filteredGroups: matched auf den Antworttext, nicht nur Title', () => {
    const { fixture } = setup({
      subcategories: [mkCategory({ id: '11', title: 'A' })],
      articlesByCat: {
        '11': [mkArticle({ id: '1', title: 'Allgemein', text: '<p>Schuhe mit heller Sohle.</p>' })],
      },
    });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    cmp.onQueryInput('schuhe');
    expect(cmp.filteredGroups()).toHaveLength(1);
  });

  it('hasResults ist false wenn Query nichts findet', () => {
    const { fixture } = setup({
      subcategories: [mkCategory({ id: '11', title: 'A' })],
      articlesByCat: { '11': [mkArticle({ id: '1', title: 'Parken', text: '<p>.</p>' })] },
    });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    cmp.onQueryInput('quantenphysik');
    expect(cmp.hasResults()).toBe(false);
    expect(cmp.totalVisible()).toBe(0);
  });

  // ─── Highlighting ───────────────────────────────────────────────

  it('highlight: wrapped match in <mark> im Question-HTML', () => {
    const { fixture } = setup({
      subcategories: [mkCategory({ id: '11', title: 'A' })],
      articlesByCat: { '11': [mkArticle({ id: '1', title: 'Wo Parken in Neumuenster?' })] },
    });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    cmp.onQueryInput('parken');
    const html = cmp.filteredGroups()[0].items[0].questionHtml;
    expect(html).toContain('<mark>Parken</mark>');
  });

  it('highlight: escapes HTML im Title bevor highlighted wird (XSS-Schutz)', () => {
    const { fixture } = setup({
      subcategories: [mkCategory({ id: '11', title: 'A' })],
      articlesByCat: {
        '11': [mkArticle({ id: '1', title: '<script>alert(1)</script>' })],
      },
    });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    cmp.onQueryInput('script');
    const html = cmp.filteredGroups()[0].items[0].questionHtml;
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;');
  });

  it('highlight: highlighted im Antwort-HTML ohne Tags zu zerschiessen', () => {
    const { fixture } = setup({
      subcategories: [mkCategory({ id: '11', title: 'A' })],
      articlesByCat: {
        '11': [
          mkArticle({
            id: '1',
            title: 'X',
            text: '<p>Wir haben <strong>Parkplaetze</strong>.</p>',
          }),
        ],
      },
    });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    cmp.onQueryInput('parkplaetze');
    const html = cmp.filteredGroups()[0].items[0].answerHtml;
    // Strong-Tag bleibt erhalten
    expect(html).toContain('<strong>');
    // mark steckt INNEN, nicht ueber dem Tag
    expect(html).toContain('<mark>Parkplaetze</mark>');
  });

  // ─── Akkordeon-State ───────────────────────────────────────────

  it('toggleItem: oeffnet und schliesst dasselbe Item', () => {
    const { fixture } = setup({
      subcategories: [mkCategory({ id: '11', title: 'A' })],
      articlesByCat: { '11': [mkArticle({ id: '1', alias: 'parken' })] },
    });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    expect(cmp.openId()).toBeNull();
    cmp.toggleItem('parken');
    expect(cmp.openId()).toBe('parken');
    cmp.toggleItem('parken');
    expect(cmp.openId()).toBeNull();
  });

  it('toggleItem: wechselt zu anderem Item', () => {
    const { fixture } = setup({
      subcategories: [mkCategory({ id: '11', title: 'A' })],
      articlesByCat: {
        '11': [mkArticle({ id: '1', alias: 'a' }), mkArticle({ id: '2', alias: 'b' })],
      },
    });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    cmp.toggleItem('a');
    cmp.toggleItem('b');
    expect(cmp.openId()).toBe('b');
  });

  // ─── showSectionTitles ─────────────────────────────────────────

  it('showSectionTitles: true bei "Alle", false bei spezifischer Kategorie ohne Query', () => {
    const { fixture } = setup({
      subcategories: [mkCategory({ id: '11', title: 'A' })],
      articlesByCat: { '11': [mkArticle({ id: '1' })] },
    });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    expect(cmp.showSectionTitles()).toBe(true);
    cmp.selectCategory('A');
    expect(cmp.showSectionTitles()).toBe(false);
  });

  it('showSectionTitles: true sobald Query gesetzt ist, auch wenn Kategorie spezifisch', () => {
    const { fixture } = setup({
      subcategories: [mkCategory({ id: '11', title: 'A' })],
      articlesByCat: { '11': [mkArticle({ id: '1', title: 'Parken' })] },
    });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    cmp.selectCategory('A');
    cmp.onQueryInput('park');
    // onQueryInput setzt Kategorie wieder auf "Alle", also stimmt: Alle ODER Query -> true
    expect(cmp.showSectionTitles()).toBe(true);
  });

  // ─── Rendering ──────────────────────────────────────────────────

  it('rendert Kategorie-Buttons in der Sidebar', () => {
    const { fixture } = setup({
      subcategories: [mkCategory({ id: '11', title: 'Anmeldung' })],
      articlesByCat: { '11': [mkArticle({ id: '1' })] },
    });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const btns = el.querySelectorAll('.cat-btn');
    // "Alle" + "Anmeldung"
    expect(btns.length).toBe(2);
    expect(btns[0].textContent).toContain('Alle');
    expect(btns[1].textContent).toContain('Anmeldung');
  });

  it('rendert Accordion-Items mit der erwarteten ID', () => {
    const { fixture } = setup({
      subcategories: [mkCategory({ id: '11', title: 'A' })],
      articlesByCat: { '11': [mkArticle({ id: '1', alias: 'parken' })] },
    });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#parken')).not.toBeNull();
  });

  it('zeigt Empty-State wenn keine Treffer', () => {
    const { fixture } = setup({
      subcategories: [mkCategory({ id: '11', title: 'A' })],
      articlesByCat: { '11': [mkArticle({ id: '1', title: 'Parken' })] },
    });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    cmp.onQueryInput('nichts-passt-hier');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.empty-state')).not.toBeNull();
  });
});
