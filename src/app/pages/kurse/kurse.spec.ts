import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { Kurse } from './kurse';
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
  no_online_registration: [],
  infotexts: [],
  enforce_no_partner_categories: [],
  enforce_partner_target_groups: [],
  phone: '04321 1 49 00',
};

describe('Kurse', () => {
  function setup(opts: { catalog?: DanceClassCatalog | null; config?: CotasSiteConfig | null } = {}) {
    const apiMock = {
      loadCatalog: () => (opts.catalog === undefined ? of(mkCatalog()) : of(opts.catalog!)),
      loadConfig: () => (opts.config === undefined ? of(EMPTY_CONFIG) : of(opts.config!)),
    };
    TestBed.configureTestingModule({
      imports: [Kurse],
      providers: [provideRouter([]), { provide: CotasApiService, useValue: apiMock }],
    });
    return TestBed.createComponent(Kurse);
  }

  it('zeigt Loading-State wenn Katalog noch null ist', () => {
    const fixture = setup({ catalog: null as unknown as DanceClassCatalog });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Kurse werden geladen');
  });

  it('zeigt Tabs aus den Target Groups', () => {
    const fixture = setup();
    fixture.detectChanges();
    const tabs = (fixture.nativeElement as HTMLElement).querySelectorAll('.zg-tab');
    expect(tabs.length).toBe(2);
    expect(tabs[0].textContent).toContain('Zielgruppe A');
  });

  it('selectGroup setzt activeGroup und reset Category auf "Alle"', () => {
    const fixture = setup();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      selectGroup(id: string): void;
      activeGroupId: { (): string | null };
      activeCategoryId: { (): string };
      allCategoriesId: string;
    };
    cmp.selectGroup('ZG-B');
    expect(cmp.activeGroupId()).toBe('ZG-B');
    expect(cmp.activeCategoryId()).toBe(cmp.allCategoriesId);
  });

  it('filteredCategories zeigt nur die aktive Kategorie wenn gewaehlt', () => {
    const fixture = setup();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      selectCategory(id: string): void;
      filteredCategories: { (): readonly CategoryWithClasses[] };
    };
    cmp.selectCategory('CAT-2');
    fixture.detectChanges();
    const cats = cmp.filteredCategories();
    expect(cats).toHaveLength(1);
    expect(cats[0].id).toBe('CAT-2');
  });

  it('isOnlineRegistrationBlocked erkennt no_online Kategorien', () => {
    const fixture = setup({
      config: { ...EMPTY_CONFIG, no_online_registration: ['CAT-1'] },
    });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      isOnlineRegistrationBlocked(c: CotasDanceClass): boolean;
    };
    expect(cmp.isOnlineRegistrationBlocked(mkClass({ kategorie_id: 'CAT-1' }))).toBe(true);
    expect(cmp.isOnlineRegistrationBlocked(mkClass({ kategorie_id: 'CAT-XYZ' }))).toBe(false);
  });

  it('isFull erkennt full=1, "1", true; rest behandelt als open', () => {
    const fixture = setup();
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

  it('seatsLeft liefert Zahl bei rest gesetzt, null wenn fehlt', () => {
    const fixture = setup();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      seatsLeft(c: CotasDanceClass): number | null;
    };
    expect(cmp.seatsLeft(mkClass({ rest: 5 }))).toBe(5);
    expect(cmp.seatsLeft(mkClass({ rest: null }))).toBeNull();
  });

  it('duration berechnet aus start/ende in Minuten', () => {
    const fixture = setup();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      duration(c: CotasDanceClass): number;
    };
    expect(cmp.duration(mkClass({ start: '19:30:00', ende: '20:45:00' }))).toBe(75);
    expect(cmp.duration(mkClass({ start: '', ende: '' }))).toBe(0);
  });
});
