import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, EMPTY, Observable, of } from 'rxjs';

import { Kurse, slugify } from './kurse';
import { CotasApiService } from '../../core/services/cotas-api.service';
import {
  CategoryWithClasses,
  CotasDanceClass,
  CotasSiteConfig,
  DanceClassCatalog,
} from '../../core/models/cotas.models';

function mkClass(over: Partial<CotasDanceClass>): CotasDanceClass {
  return {
    id: '1',
    kurskennung: 'K-1',
    kurs_bez: 'Test',
    kurs_nr: '',
    saison: '',
    jahr: '',
    standort: '',
    saal_bez: '',
    kzclub: '0',
    zielgruppen_id: 'ZG-A',
    zielgruppen_bez: 'Zielgruppe A',
    zielgruppen_priority: '1',
    kategorie_id: 'CAT-1',
    kategorie_bez: 'Kategorie 1',
    kategorie_priority: '5',
    tag: 'Montag',
    kurs_beginn: '2026-04-01',
    tmpl_kurs_beginn: '01.04.2026',
    start: '20:00:00',
    ende: '21:00:00',
    tmpl_start: '20:00',
    einheiten: '8',
    terminrhythmus: '1',
    next_date: null,
    honorar: '96.00',
    umsatzsteuerfrei: '1',
    kursleiter: 'Max',
    assistent: '',
    info_text: '<p>Beschreibung</p>',
    headline: '',
    full: null,
    rest: null,
    started: 0,
    finished: 0,
    show_next: 0,
    schnupperkurs: '0',
    contracts: null,
    type: 'kurs',
    ...over,
  } as CotasDanceClass;
}

function mkCatalog(): DanceClassCatalog {
  const c1 = mkClass({ id: '1', kategorie_id: 'CAT-1', kategorie_bez: 'Welttanz' });
  const c2 = mkClass({ id: '2', kategorie_id: 'CAT-2', kategorie_bez: 'Discofox' });
  const c3 = mkClass({ id: '3', kategorie_id: 'CAT-1', kurs_bez: 'Welttanz Late', full: 1 });

  const cat1: CategoryWithClasses = {
    id: 'CAT-1',
    bez: 'Welttanz',
    priority: 5,
    classes: [c1, c3],
  };
  const cat2: CategoryWithClasses = {
    id: 'CAT-2',
    bez: 'Discofox',
    priority: 10,
    classes: [c2],
  };

  return {
    targetGroups: [
      { id: 'ZG-A', name: 'A', bez: 'Zielgruppe A', beschreibung: '', priority: 1, active: 'active' },
      { id: 'ZG-B', name: 'B', bez: 'Zielgruppe B', beschreibung: '', priority: 2, active: '' },
    ],
    classesByGroup: new Map([
      ['ZG-A', [c1, c2, c3]],
      ['ZG-B', []],
    ]),
    categoriesByGroup: new Map([
      ['ZG-A', [cat1, cat2]],
      ['ZG-B', []],
    ]),
  };
}

const EMPTY_CONFIG: CotasSiteConfig = {
  enforce_no_partner_categories: [],
  enforce_partner_target_groups: [],
  phone: '04321 1 49 00',
};

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
    navigate: (cmds: unknown[], extras?: unknown): Promise<boolean> => {
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

function makeRoute(opts: { gruppe?: string; kategorie?: string } = {}) {
  const initial: Record<string, string> = {};
  if (opts.gruppe) initial['gruppe'] = opts.gruppe;
  if (opts.kategorie) initial['kategorie'] = opts.kategorie;
  const params$ = new BehaviorSubject(convertToParamMap(initial));
  return {
    queryParamMap: params$.asObservable(),
  };
}

describe('Kurse', () => {
  function setup(opts: {
    catalog?: DanceClassCatalog | null;
    config?: CotasSiteConfig | null;
    gruppe?: string;
    kategorie?: string;
  } = {}) {
    const apiMock = {
      loadCatalog: () => (opts.catalog === undefined ? of(mkCatalog()) : of(opts.catalog!)),
      loadConfig: () => (opts.config === undefined ? of(EMPTY_CONFIG) : of(opts.config!)),
    };
    const routerSpy = makeRouterSpy();
    const route = makeRoute({ gruppe: opts.gruppe, kategorie: opts.kategorie });
    TestBed.configureTestingModule({
      imports: [Kurse],
      providers: [
        { provide: CotasApiService, useValue: apiMock },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: route },
      ],
    });
    const fixture = TestBed.createComponent(Kurse);
    return { fixture, routerSpy };
  }

  it('zeigt Loading-State wenn Katalog noch null ist', () => {
    const { fixture } = setup({ catalog: null as unknown as DanceClassCatalog });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Wird geladen');
  });

  it('zeigt Tabs aus den Target Groups', () => {
    const { fixture } = setup();
    fixture.detectChanges();
    const tabs = (fixture.nativeElement as HTMLElement).querySelectorAll('.zg-tab');
    expect(tabs.length).toBe(2);
    expect(tabs[0].textContent).toContain('Zielgruppe A');
  });

  it('selectGroup navigiert mit slugified Gruppen-Label und entfernt kategorie-Param', () => {
    const { fixture, routerSpy } = setup();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      selectGroup(id: string): void;
    };
    cmp.selectGroup('ZG-B');
    expect(routerSpy.navigateCalls).toHaveLength(1);
    const extras = routerSpy.navigateCalls[0].extras as {
      queryParams: { gruppe: string; kategorie: string | null };
      queryParamsHandling: string;
      replaceUrl: boolean;
    };
    // "Zielgruppe B" -> "zielgruppe-b"
    expect(extras.queryParams.gruppe).toBe('zielgruppe-b');
    // Kategorie wird zurueckgesetzt (sonst koennte ein Slug aus der
    // vorherigen Gruppe stehenbleiben der hier nicht existiert)
    expect(extras.queryParams.kategorie).toBeNull();
    expect(extras.replaceUrl).toBe(true);
  });

  it('toggleCategory navigiert mit kategorie-Slug (Add)', () => {
    const { fixture, routerSpy } = setup();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      toggleCategory(id: string): void;
    };
    cmp.toggleCategory('CAT-2');
    expect(routerSpy.navigateCalls).toHaveLength(1);
    const extras = routerSpy.navigateCalls[0].extras as {
      queryParams: { kategorie: string };
    };
    // "Discofox" -> "discofox"
    expect(extras.queryParams.kategorie).toBe('discofox');
  });

  it('toggleCategory dedupliziert + sortiert die Slug-Liste alphabetisch', () => {
    const { fixture, routerSpy } = setup({ kategorie: 'welttanz' });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      toggleCategory(id: string): void;
    };
    cmp.toggleCategory('CAT-2'); // Discofox dazu
    const extras = routerSpy.navigateCalls[0].extras as {
      queryParams: { kategorie: string };
    };
    // Alphabetisch: discofox vor welttanz
    expect(extras.queryParams.kategorie).toBe('discofox,welttanz');
  });

  it('toggleCategory entfernt die Kategorie wenn schon aktiv', () => {
    const { fixture, routerSpy } = setup({ kategorie: 'discofox,welttanz' });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      toggleCategory(id: string): void;
    };
    cmp.toggleCategory('CAT-2'); // Discofox wieder raus
    const extras = routerSpy.navigateCalls[0].extras as {
      queryParams: { kategorie: string };
    };
    expect(extras.queryParams.kategorie).toBe('welttanz');
  });

  it('toggleCategory: letzte aktive Kategorie wegklicken -> Param null', () => {
    const { fixture, routerSpy } = setup({ kategorie: 'discofox' });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      toggleCategory(id: string): void;
    };
    cmp.toggleCategory('CAT-2');
    const extras = routerSpy.navigateCalls[0].extras as {
      queryParams: { kategorie: string | null };
    };
    expect(extras.queryParams.kategorie).toBeNull();
  });

  it('resetCategory: leert alle Kategorie-Filter', () => {
    const { fixture, routerSpy } = setup({ kategorie: 'discofox,welttanz' });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      resetCategory(): void;
    };
    cmp.resetCategory();
    const extras = routerSpy.navigateCalls[0].extras as {
      queryParams: { kategorie: string | null };
    };
    expect(extras.queryParams.kategorie).toBeNull();
  });

  it('filteredCategories: URL-Param kategorie filtert (einzeln)', () => {
    const { fixture } = setup({ kategorie: 'discofox' });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      filteredCategories: { (): readonly CategoryWithClasses[] };
    };
    const cats = cmp.filteredCategories();
    expect(cats).toHaveLength(1);
    expect(cats[0].id).toBe('CAT-2');
  });

  it('filteredCategories: URL-Param kategorie filtert (mehrfach, Slug-Liste)', () => {
    const { fixture } = setup({ kategorie: 'discofox,welttanz' });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      filteredCategories: { (): readonly CategoryWithClasses[] };
      activeCategoryIds: { (): ReadonlySet<string> };
    };
    expect(cmp.activeCategoryIds().size).toBe(2);
    expect(cmp.filteredCategories()).toHaveLength(2);
  });

  it('filteredCategories: leerer Param == alle Kategorien sichtbar', () => {
    const { fixture } = setup();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      filteredCategories: { (): readonly CategoryWithClasses[] };
      allCategoriesActive: { (): boolean };
    };
    expect(cmp.allCategoriesActive()).toBe(true);
    expect(cmp.filteredCategories()).toHaveLength(2);
  });

  it('currentGroupId: URL-Param matched per Slug auf die richtige Gruppe', () => {
    const { fixture } = setup({ gruppe: 'zielgruppe-b' });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      currentGroupId: { (): string | null };
    };
    expect(cmp.currentGroupId()).toBe('ZG-B');
  });

  it('currentGroupId: Fallback ID-Match wenn Slug nicht passt (alte Bookmarks)', () => {
    const { fixture } = setup({ gruppe: 'ZG-B' });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      currentGroupId: { (): string | null };
    };
    expect(cmp.currentGroupId()).toBe('ZG-B');
  });

  it('currentGroupId: Fallback auf erste Gruppe wenn Slug NICHT existiert', () => {
    const { fixture } = setup({ gruppe: 'haengematte' });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      currentGroupId: { (): string | null };
    };
    expect(cmp.currentGroupId()).toBe('ZG-A');
  });

  it('currentGroupId: Default-Verhalten (kein Param) -> erste Gruppe', () => {
    const { fixture } = setup();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      currentGroupId: { (): string | null };
    };
    expect(cmp.currentGroupId()).toBe('ZG-A');
  });

  it('isOnlineRegistrationBlocked blockt Clubs (kzclub=1), nicht regulaere Kurse', () => {
    const { fixture } = setup();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      isOnlineRegistrationBlocked(c: CotasDanceClass): boolean;
    };
    expect(cmp.isOnlineRegistrationBlocked(mkClass({ kzclub: '1' }))).toBe(true);
    expect(cmp.isOnlineRegistrationBlocked(mkClass({ kzclub: '0' }))).toBe(false);
    expect(cmp.isOnlineRegistrationBlocked(mkClass({ kzclub: 1 as unknown as string }))).toBe(true);
  });

  it('isFull erkennt full=1, "1", true; rest behandelt als open', () => {
    const { fixture } = setup();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      isFull(c: CotasDanceClass): boolean;
    };
    expect(cmp.isFull(mkClass({ full: 1 }))).toBe(true);
    expect(cmp.isFull(mkClass({ full: '1' }))).toBe(true);
    expect(cmp.isFull(mkClass({ full: true }))).toBe(true);
    expect(cmp.isFull(mkClass({ full: 0 }))).toBe(false);
    expect(cmp.isFull(mkClass({ full: null }))).toBe(false);
  });

  it('duration berechnet aus start/ende in Minuten', () => {
    const { fixture } = setup();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      duration(c: CotasDanceClass): number;
    };
    expect(cmp.duration(mkClass({ start: '19:30:00', ende: '20:45:00' }))).toBe(75);
    expect(cmp.duration(mkClass({ start: '', ende: '' }))).toBe(0);
  });

  it('descriptionFor liefert den vollen Text aus info_text (HTML-stripped)', () => {
    const { fixture } = setup();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      descriptionFor(c: { id: string; classes: CotasDanceClass[] }): string;
    };
    const longText = 'Tanz! '.repeat(80); // ~480 Zeichen, NICHT gekuerzt
    const cat = { id: 'X', classes: [mkClass({ info_text: longText })] };
    const text = cmp.descriptionFor(cat);
    expect(text.length).toBeGreaterThan(200);
    expect(text.startsWith('Tanz!')).toBe(true);
  });

  // ─── Abo / kzclub ────────────────────────────────────────────────

  it('isAbo erkennt kzclub als "1" (String) und 1 (Number)', () => {
    const { fixture } = setup();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      isAbo(c: CotasDanceClass): boolean;
    };
    expect(cmp.isAbo(mkClass({ kzclub: '1' }))).toBe(true);
    expect(cmp.isAbo(mkClass({ kzclub: 1 as unknown as string }))).toBe(true);
  });

  it('isAbo gibt false fuer Kurs (kzclub 0/"0"/leer)', () => {
    const { fixture } = setup();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      isAbo(c: CotasDanceClass): boolean;
    };
    expect(cmp.isAbo(mkClass({ kzclub: '0' }))).toBe(false);
    expect(cmp.isAbo(mkClass({ kzclub: 0 as unknown as string }))).toBe(false);
    expect(cmp.isAbo(mkClass({ kzclub: '' }))).toBe(false);
  });

  it('dayAndStart: Kurs mit Datum -> "Tag, Datum"', () => {
    const { fixture } = setup();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      dayAndStart(c: CotasDanceClass): string;
    };
    const c = mkClass({ kzclub: '0', tag: 'Dienstag', tmpl_kurs_beginn: '13.08.2026' });
    expect(cmp.dayAndStart(c)).toBe('Dienstag, 13.08.2026');
  });

  it('dayAndStart: Kurs ohne Datum -> nur "Tag"', () => {
    const { fixture } = setup();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      dayAndStart(c: CotasDanceClass): string;
    };
    const c = mkClass({ kzclub: '0', tag: 'Mittwoch', tmpl_kurs_beginn: '' });
    expect(cmp.dayAndStart(c)).toBe('Mittwoch');
  });

  it('dayAndStart: Abo ignoriert das Datum (zeigt nur den Tag)', () => {
    const { fixture } = setup();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      dayAndStart(c: CotasDanceClass): string;
    };
    const c = mkClass({ kzclub: '1', tag: 'Donnerstag', tmpl_kurs_beginn: '13.08.2019' });
    expect(cmp.dayAndStart(c)).toBe('Donnerstag');
  });

  it('Template zeigt bei Abo-Kurs in der Liste kein Datum an', () => {
    const aboClass = mkClass({
      id: 'abo-1',
      kzclub: '1',
      tag: 'Mittwoch',
      tmpl_kurs_beginn: '13.08.2019',
      kurs_bez: 'Tanz-Club',
      kategorie_id: 'CAT-ABO',
      kategorie_bez: 'Club',
    });
    const cat: CategoryWithClasses = {
      id: 'CAT-ABO',
      bez: 'Club',
      priority: 1,
      classes: [aboClass],
    };
    const catalog: DanceClassCatalog = {
      targetGroups: [
        { id: 'ZG-A', name: 'A', bez: 'A', beschreibung: '', priority: 1, active: 'active' },
      ],
      classesByGroup: new Map([['ZG-A', [aboClass]]]),
      categoriesByGroup: new Map([['ZG-A', [cat]]]),
    };
    const { fixture } = setup({ catalog });
    fixture.detectChanges();
    const when = (fixture.nativeElement as HTMLElement).querySelector('.termin-when strong');
    expect(when?.textContent).toBe('Mittwoch');
    expect(when?.textContent).not.toContain('13.08.2019');
  });
});

describe('slugify', () => {
  it('lowercased ascii', () => {
    expect(slugify('Erwachsene')).toBe('erwachsene');
  });

  it('deutsche Umlaute werden transliteriert', () => {
    expect(slugify('Tanzschüler')).toBe('tanzschueler');
    expect(slugify('Mädchen')).toBe('maedchen');
    expect(slugify('Größenwahn')).toBe('groessenwahn');
  });

  it('Sonderzeichen + Whitespace werden zu Bindestrichen', () => {
    expect(slugify('Kinder 3-5 Jahre')).toBe('kinder-3-5-jahre');
    expect(slugify('Hip Hop / Streetdance')).toBe('hip-hop-streetdance');
  });

  it('keine fuehrenden/trailing Bindestriche', () => {
    expect(slugify('  Discofox  ')).toBe('discofox');
    expect(slugify('--Test--')).toBe('test');
  });
});
