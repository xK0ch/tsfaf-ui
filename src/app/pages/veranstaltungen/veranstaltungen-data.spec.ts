import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import {
  mapVeranstaltung,
  parseTimeRanges,
  VeranstaltungenStore,
} from './veranstaltungen-data';
import type { JoomlaArticle } from '../../core/models/joomla.models';
import { environment } from '../../../environments/environment';

// ─── Helpers ──────────────────────────────────────────────────────

function mkJoomlaArticle(over: Partial<JoomlaArticle> = {}): JoomlaArticle {
  return {
    id: '1',
    title: 'Test-Event',
    alias: 'test-event',
    state: 1,
    text: '',
    created: '2026-01-01 10:00:00',
    modified: '2026-01-01 10:00:00',
    publish_up: null,
    publish_down: null,
    language: '*',
    featured: 0,
    images: {},
    categoryId: '14',
    tagIds: [],
    ...over,
  };
}

// ─── parseTimeRanges ──────────────────────────────────────────────

describe('parseTimeRanges', () => {
  it('parst HH:MM Format', () => {
    const r = parseTimeRanges('19:00 - 20:30');
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({
      startLabel: '19:00',
      endLabel: '20:30',
      startHour: 19,
      startMinute: 0,
      endHour: 20,
      endMinute: 30,
    });
  });

  it('parst HH.MM Format mit " Uhr" Suffix', () => {
    const r = parseTimeRanges('19.00 - 20.30 Uhr');
    expect(r).toHaveLength(1);
    expect(r[0].startLabel).toBe('19:00');
    expect(r[0].endLabel).toBe('20:30');
  });

  it('parst mehrere Zeilen', () => {
    const r = parseTimeRanges('19.00 - 20.30 Uhr\r\n20.30 - 22.00 Uhr');
    expect(r).toHaveLength(2);
    expect(r[0].startLabel).toBe('19:00');
    expect(r[1].endLabel).toBe('22:00');
  });

  it('paddet einstellige Stunden zu zweistellig', () => {
    const r = parseTimeRanges('9:00 - 10:30');
    expect(r[0].startLabel).toBe('09:00');
  });

  it('ignoriert ungueltige Zeilen, behaelt gueltige', () => {
    const r = parseTimeRanges('lalala\n19:00 - 20:00\nnope nope\n21:00 - 22:00');
    expect(r).toHaveLength(2);
    expect(r[0].startLabel).toBe('19:00');
    expect(r[1].startLabel).toBe('21:00');
  });

  it('weist Zeit > 23:59 ab', () => {
    expect(parseTimeRanges('25:00 - 26:00')).toEqual([]);
    expect(parseTimeRanges('19:00 - 19:60')).toEqual([]);
  });

  it('akzeptiert Halbgeviertstrich und Geviertstrich als Trenner', () => {
    expect(parseTimeRanges('19:00 – 20:00')).toHaveLength(1);
    expect(parseTimeRanges('19:00 — 20:00')).toHaveLength(1);
  });

  it('liefert leere Liste bei leerem oder rein-whitespace Input', () => {
    expect(parseTimeRanges('')).toEqual([]);
    expect(parseTimeRanges('\n\n  \n')).toEqual([]);
  });
});

// ─── mapVeranstaltung ─────────────────────────────────────────────

describe('mapVeranstaltung', () => {
  function attrs(over: Record<string, unknown>): JoomlaArticle {
    const base = mkJoomlaArticle();
    return Object.assign({}, base, over) as JoomlaArticle;
  }

  it('mapped Standardfelder', () => {
    const a = mapVeranstaltung(
      mkJoomlaArticle({ id: '42', title: 'Workshop', alias: 'workshop-mai' }),
    );
    expect(a.id).toBe('42');
    expect(a.slug).toBe('workshop-mai');
    expect(a.title).toBe('Workshop');
  });

  it('Slug-Fallback auf "event-<id>" wenn alias leer', () => {
    const a = mapVeranstaltung(mkJoomlaArticle({ id: '99', alias: '' }));
    expect(a.slug).toBe('event-99');
  });

  it('Typ aus List-Field-Objekt (Joomla-Format: {key: display})', () => {
    const a = mapVeranstaltung(
      attrs({ 'typ-veranstaltung': { 'Workshop': 'Workshop' } }),
    );
    expect(a.type).toBe('Workshop');
    expect(a.typeLabel).toBe('Workshop');
  });

  it('Typ fallback auf "Sonstige" wenn fehlt', () => {
    const a = mapVeranstaltung(mkJoomlaArticle());
    expect(a.type).toBe('Sonstige');
  });

  it('Datum aus "YYYY-MM-DD HH:MM:SS" — nur Datum behalten', () => {
    const a = mapVeranstaltung(attrs({ 'datum': '2026-06-15 15:55:28' }));
    expect(a.date.getFullYear()).toBe(2026);
    expect(a.date.getMonth()).toBe(5); // Juni
    expect(a.date.getDate()).toBe(15);
    expect(a.day).toBe(15);
  });

  it('past=true wenn Datum vor heute, false sonst', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const fmt = (d: Date): string =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} 00:00:00`;

    const past = mapVeranstaltung(attrs({ 'datum': fmt(yesterday) }));
    expect(past.past).toBe(true);

    const future = mapVeranstaltung(attrs({ 'datum': fmt(tomorrow) }));
    expect(future.past).toBe(false);
  });

  it('Zeiten werden geparst, timeSummary bei 1 Slot zeigt Start-Ende', () => {
    const a = mapVeranstaltung(
      attrs({ 'zeiten': '19.00 - 20.30 Uhr' }),
    );
    expect(a.timeRanges).toHaveLength(1);
    expect(a.timeSummary).toBe('19:00 - 20:30 Uhr');
  });

  it('timeSummary bei 2+ Slots zeigt umschliessenden Bereich und Block-Anzahl', () => {
    const a = mapVeranstaltung(
      attrs({ 'zeiten': '19.00 - 20.30 Uhr\n20.30 - 22.00 Uhr' }),
    );
    expect(a.timeRanges).toHaveLength(2);
    expect(a.timeSummary).toContain('19:00 - 22:00');
    expect(a.timeSummary).toContain('2 Blöcke');
  });

  it('start + end kombinieren Datum + erster/letzter Slot', () => {
    const a = mapVeranstaltung(
      attrs({
        'datum': '2026-06-15 00:00:00',
        'zeiten': '19:00 - 20:30\n21:00 - 22:30',
      }),
    );
    expect(a.start.getHours()).toBe(19);
    expect(a.start.getMinutes()).toBe(0);
    expect(a.end.getHours()).toBe(22);
    expect(a.end.getMinutes()).toBe(30);
    expect(a.end.getDate()).toBe(15);
  });

  it('end ueber Mitternacht wird auf Folgetag gesetzt', () => {
    const a = mapVeranstaltung(
      attrs({
        'datum': '2026-04-30 00:00:00',
        'zeiten': '21:00 - 01:00',
      }),
    );
    expect(a.start.getDate()).toBe(30);
    expect(a.end.getDate()).toBe(1);
    expect(a.end.getMonth()).toBe(4); // Mai
  });

  it('Voranmeldung: Ja wenn key === "Ja"', () => {
    const ja = mapVeranstaltung(
      attrs({ 'voranmeldung-erforderlich': { 'Ja': 'Ja' } }),
    );
    expect(ja.requiresRegistration).toBe(true);

    const nein = mapVeranstaltung(
      attrs({ 'voranmeldung-erforderlich': { 'Nein': 'Nein' } }),
    );
    expect(nein.requiresRegistration).toBe(false);

    const fehlt = mapVeranstaltung(mkJoomlaArticle());
    expect(fehlt.requiresRegistration).toBe(false);
  });

  it('Preise werden 1:1 als String durchgereicht', () => {
    const a = mapVeranstaltung(
      attrs({
        'preis': '15 €',
        'preis-mit-kundenkarte': 'frei',
      }),
    );
    expect(a.price).toBe('15 €');
    expect(a.priceCard).toBe('frei');
  });
});

// ─── VeranstaltungenStore ─────────────────────────────────────────

describe('VeranstaltungenStore', () => {
  let http: HttpTestingController;
  const BASE = environment.joomlaApiBase;

  function setupStore(): VeranstaltungenStore {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        VeranstaltungenStore,
      ],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(VeranstaltungenStore);
  }

  afterEach(() => {
    http.verify();
  });

  function mkResource(id: string, attrsOverride: Record<string, unknown> = {}) {
    return {
      type: 'article',
      id,
      attributes: {
        id: Number(id),
        title: `Event ${id}`,
        alias: `event-${id}`,
        state: 1,
        access: 1,
        created: '2026-01-01 10:00:00',
        modified: '2026-01-01 10:00:00',
        publish_up: null,
        publish_down: null,
        featured: 0,
        language: '*',
        text: '',
        ...attrsOverride,
      },
    };
  }

  it('feuert Request gegen Veranstaltungs-Kategorie', () => {
    setupStore();
    const req = http.expectOne(r => r.url === `${BASE}/content/articles`);
    expect(req.request.params.get('filter[category]')).toBe(
      String(environment.joomlaCategoryVeranstaltungen),
    );
    req.flush({ data: [] });
  });

  it('availableTypes dedupliziert und sortiert alphabetisch', () => {
    const store = setupStore();
    const req = http.expectOne(r => r.url === `${BASE}/content/articles`);
    req.flush({
      data: [
        mkResource('1', { 'typ-veranstaltung': { 'Workshop': 'Workshop' } }),
        mkResource('2', { 'typ-veranstaltung': { 'Just Dance': 'Just Dance' } }),
        mkResource('3', { 'typ-veranstaltung': { 'Workshop': 'Workshop' } }),
        mkResource('4', { 'typ-veranstaltung': { 'Tanzparty': 'Tanzparty' } }),
      ],
    });
    expect(store.availableTypes().map(t => t.label)).toEqual([
      'Just Dance',
      'Tanzparty',
      'Workshop',
    ]);
  });

  it('loading() wird false sobald die Response da ist', () => {
    const store = setupStore();
    expect(store.loading()).toBe(true);
    http.expectOne(r => r.url === `${BASE}/content/articles`).flush({ data: [] });
    expect(store.loading()).toBe(false);
  });
});
