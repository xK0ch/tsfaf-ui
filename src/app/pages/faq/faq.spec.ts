import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { buildFaqGroups, Faq } from './faq';
import { JoomlaApiService } from '../../core/services/joomla-api.service';
import type { JoomlaArticle } from '../../core/models/joomla.models';

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Baut einen JoomlaArticle mit gesetztem `typ-faq`-Custom-Field.
 * Wenn `typ` weggelassen wird, hat der Article kein Typ-Feld
 * (=Fallback auf "Allgemein" im Mapper).
 */
function mkArticle(typ: string | null, over: Partial<JoomlaArticle> = {}): JoomlaArticle {
  const base: JoomlaArticle = {
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
  };
  if (typ !== null) {
    (base as Record<string, unknown>)['typ-faq'] = { [typ]: typ };
  }
  return { ...base, ...over };
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

// ─── buildFaqGroups (pure mapper) ─────────────────────────────────

describe('buildFaqGroups', () => {
  it('gruppiert nach typ-faq-Key', () => {
    const groups = buildFaqGroups([
      mkArticle('Anmeldung', { id: '1', alias: 'a' }),
      mkArticle('Praktisches', { id: '2', alias: 'b' }),
      mkArticle('Anmeldung', { id: '3', alias: 'c' }),
    ]);
    expect(groups).toHaveLength(2);
    const anmeldung = groups.find(g => g.category === 'Anmeldung');
    const praktisches = groups.find(g => g.category === 'Praktisches');
    expect(anmeldung?.items.map(i => i.id)).toEqual(['a', 'c']);
    expect(praktisches?.items.map(i => i.id)).toEqual(['b']);
  });

  it('sortiert Gruppen alphabetisch', () => {
    const groups = buildFaqGroups([
      mkArticle('Praktisches', { id: '1' }),
      mkArticle('Anmeldung', { id: '2' }),
      mkArticle('Bezahlung', { id: '3' }),
    ]);
    expect(groups.map(g => g.category)).toEqual(['Anmeldung', 'Bezahlung', 'Praktisches']);
  });

  it('faellt auf "Allgemein" zurueck wenn typ-faq fehlt', () => {
    const groups = buildFaqGroups([mkArticle(null, { id: '1' })]);
    expect(groups).toHaveLength(1);
    expect(groups[0].category).toBe('Allgemein');
  });

  it('FAQ-Item-id = alias, mit Fallback "faq-<id>" wenn alias leer', () => {
    const groups = buildFaqGroups([
      mkArticle('A', { id: '1', alias: 'mein-alias' }),
      mkArticle('A', { id: '99', alias: '' }),
    ]);
    expect(groups[0].items.map(i => i.id)).toEqual(['mein-alias', 'faq-99']);
  });

  it('leeres Article-Array → leere Gruppen-Liste', () => {
    expect(buildFaqGroups([])).toEqual([]);
  });
});

// ─── Faq-Komponente ──────────────────────────────────────────────

describe('Faq', () => {
  function setup(articles: readonly JoomlaArticle[] = []) {
    const apiMock = {
      listArticles: () => of(articles),
    };
    TestBed.configureTestingModule({
      imports: [Faq],
      providers: [provideRouter([]), { provide: JoomlaApiService, useValue: apiMock }],
    });
    return TestBed.createComponent(Faq);
  }

  // ─── Datenfluss ────────────────────────────────────────────────

  it('baut pro typ-faq-Wert eine Gruppe', () => {
    const fixture = setup([
      mkArticle('Anmeldung', { id: '1', title: 'Wie melde ich mich an?', alias: 'anmelden' }),
      mkArticle('Praktisches', { id: '2', title: 'Parken?', alias: 'parken' }),
      mkArticle('Praktisches', { id: '3', title: 'Schuhe?', alias: 'schuhe' }),
    ]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    const groups = cmp.faqGroups();
    expect(groups).toHaveLength(2);
    expect(groups!.map(g => g.category)).toEqual(['Anmeldung', 'Praktisches']);
    expect(groups![1].items).toHaveLength(2);
  });

  it('faellt auf "Allgemein" zurueck wenn typ-faq fehlt', () => {
    const fixture = setup([
      mkArticle(null, { id: '1', title: 'Parken?', alias: 'parken' }),
    ]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    const groups = cmp.faqGroups();
    expect(groups).toHaveLength(1);
    expect(groups![0].category).toBe('Allgemein');
  });

  it('faellt auf "faq-<id>" ID zurueck wenn alias leer ist', () => {
    const fixture = setup([
      mkArticle('A', { id: '99', alias: '' }),
    ]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    const groups = cmp.faqGroups();
    expect(groups![0].items[0]).toMatchObject({ id: 'faq-99' });
  });

  // ─── Loading ────────────────────────────────────────────────────

  it('loading ist false sobald die API synchron geliefert hat', () => {
    const fixture = setup([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    expect(cmp.loading()).toBe(false);
    expect(cmp.faqGroups()).not.toBeNull();
  });

  // ─── Kategorien-Sidebar ────────────────────────────────────────

  it('categories enthaelt Alle + jede Gruppe mit korrektem Count', () => {
    const fixture = setup([
      mkArticle('A', { id: '1' }),
      mkArticle('A', { id: '2' }),
      mkArticle('B', { id: '3' }),
    ]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    expect(cmp.categories()).toEqual([
      { name: 'Alle', count: 3 },
      { name: 'A', count: 2 },
      { name: 'B', count: 1 },
    ]);
  });

  it('totalItemCount summiert alle Items ueber alle Gruppen', () => {
    const fixture = setup([
      mkArticle('A', { id: '1' }),
      mkArticle('A', { id: '2' }),
    ]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    expect(cmp.totalItemCount()).toBe(2);
  });

  // ─── Filter: Kategorie ──────────────────────────────────────────

  it('selectCategory: setzt activeCategory und leert query', () => {
    const fixture = setup([mkArticle('B', { id: '2' })]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    cmp.onQueryInput('parken');
    cmp.selectCategory('B');
    expect(cmp.activeCategory()).toBe('B');
    expect(cmp.query()).toBe('');
  });

  it('filteredGroups: nur aktive Kategorie wenn nicht "Alle"', () => {
    const fixture = setup([
      mkArticle('A', { id: '1' }),
      mkArticle('B', { id: '2' }),
    ]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    cmp.selectCategory('B');
    expect(cmp.filteredGroups()).toHaveLength(1);
    expect(cmp.filteredGroups()[0].category).toBe('B');
  });

  // ─── Filter: Such-Query ────────────────────────────────────────

  it('onQueryInput: aktiviert "Alle" sobald gesucht wird', () => {
    const fixture = setup([mkArticle('A', { id: '1' })]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    cmp.selectCategory('A');
    cmp.onQueryInput('parken');
    expect(cmp.activeCategory()).toBe('Alle');
    expect(cmp.query()).toBe('parken');
  });

  it('filteredGroups: filtert Items per Volltext (q + a, case-insensitive)', () => {
    const fixture = setup([
      mkArticle('A', { id: '1', alias: 'parken', title: 'Wo Parken?', text: '<p>Parkplaetze sind kostenlos.</p>' }),
      mkArticle('A', { id: '2', alias: 'schuhe', title: 'Schuhe?', text: '<p>Tanzschuhe oder saubere Sohlen.</p>' }),
    ]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    cmp.onQueryInput('PARK');
    const groups = cmp.filteredGroups();
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(1);
    expect(groups[0].items[0].id).toBe('parken');
  });

  it('filteredGroups: matched auf den Antworttext, nicht nur Title', () => {
    const fixture = setup([
      mkArticle('A', { id: '1', title: 'Allgemein', text: '<p>Schuhe mit heller Sohle.</p>' }),
    ]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    cmp.onQueryInput('schuhe');
    expect(cmp.filteredGroups()).toHaveLength(1);
  });

  it('hasResults ist false wenn Query nichts findet', () => {
    const fixture = setup([mkArticle('A', { id: '1', title: 'Parken', text: '<p>.</p>' })]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    cmp.onQueryInput('quantenphysik');
    expect(cmp.hasResults()).toBe(false);
    expect(cmp.totalVisible()).toBe(0);
  });

  // ─── Highlighting ───────────────────────────────────────────────

  it('highlight: wrapped match in <mark> im Question-HTML', () => {
    const fixture = setup([
      mkArticle('A', { id: '1', title: 'Wo Parken in Neumuenster?' }),
    ]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    cmp.onQueryInput('parken');
    const html = cmp.filteredGroups()[0].items[0].questionHtml;
    expect(html).toContain('<mark>Parken</mark>');
  });

  it('highlight: escapes HTML im Title bevor highlighted wird (XSS-Schutz)', () => {
    const fixture = setup([
      mkArticle('A', { id: '1', title: '<script>alert(1)</script>' }),
    ]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    cmp.onQueryInput('script');
    const html = cmp.filteredGroups()[0].items[0].questionHtml;
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;');
  });

  it('highlight: highlighted im Antwort-HTML ohne Tags zu zerschiessen', () => {
    const fixture = setup([
      mkArticle('A', {
        id: '1',
        title: 'X',
        text: '<p>Wir haben <strong>Parkplaetze</strong>.</p>',
      }),
    ]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    cmp.onQueryInput('parkplaetze');
    const html = cmp.filteredGroups()[0].items[0].answerHtml;
    expect(html).toContain('<strong>');
    expect(html).toContain('<mark>Parkplaetze</mark>');
  });

  // ─── Akkordeon-State ───────────────────────────────────────────

  it('toggleItem: oeffnet und schliesst dasselbe Item', () => {
    const fixture = setup([mkArticle('A', { id: '1', alias: 'parken' })]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    expect(cmp.openId()).toBeNull();
    cmp.toggleItem('parken');
    expect(cmp.openId()).toBe('parken');
    cmp.toggleItem('parken');
    expect(cmp.openId()).toBeNull();
  });

  it('toggleItem: wechselt zu anderem Item', () => {
    const fixture = setup([
      mkArticle('A', { id: '1', alias: 'a' }),
      mkArticle('A', { id: '2', alias: 'b' }),
    ]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    cmp.toggleItem('a');
    cmp.toggleItem('b');
    expect(cmp.openId()).toBe('b');
  });

  // ─── showSectionTitles ─────────────────────────────────────────

  it('showSectionTitles: true bei "Alle", false bei spezifischer Kategorie ohne Query', () => {
    const fixture = setup([mkArticle('A', { id: '1' })]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    expect(cmp.showSectionTitles()).toBe(true);
    cmp.selectCategory('A');
    expect(cmp.showSectionTitles()).toBe(false);
  });

  it('showSectionTitles: true sobald Query gesetzt ist, auch wenn Kategorie spezifisch', () => {
    const fixture = setup([mkArticle('A', { id: '1', title: 'Parken' })]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    cmp.selectCategory('A');
    cmp.onQueryInput('park');
    expect(cmp.showSectionTitles()).toBe(true);
  });

  // ─── Rendering ──────────────────────────────────────────────────

  it('rendert Kategorie-Buttons in der Sidebar', () => {
    const fixture = setup([mkArticle('Anmeldung', { id: '1' })]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const btns = el.querySelectorAll('.cat-btn');
    // "Alle" + "Anmeldung"
    expect(btns.length).toBe(2);
    expect(btns[0].textContent).toContain('Alle');
    expect(btns[1].textContent).toContain('Anmeldung');
  });

  it('rendert Accordion-Items mit der erwarteten ID', () => {
    const fixture = setup([mkArticle('A', { id: '1', alias: 'parken' })]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#parken')).not.toBeNull();
  });

  it('zeigt Empty-State wenn keine Treffer', () => {
    const fixture = setup([mkArticle('A', { id: '1', title: 'Parken' })]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as FaqCmp;
    cmp.onQueryInput('nichts-passt-hier');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.empty-state')).not.toBeNull();
  });
});
