import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { CotasApiService } from './cotas-api.service';
import {
  CotasDanceClass,
  CotasDanceClassesResponse,
  CotasSiteConfig,
  CotasVoucher,
} from '../models/cotas.models';
import { environment } from '../../../environments/environment';

describe('CotasApiService', () => {
  let service: CotasApiService;
  let http: HttpTestingController;
  const BASE = environment.cotasApiBase;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), CotasApiService],
    });
    service = TestBed.inject(CotasApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  // ─── Health ───────────────────────────────────────────────────────

  it('health: GET /health', () => {
    let response: { status: string; time: string } | undefined;
    service.health().subscribe(r => (response = r));

    const req = http.expectOne(`${BASE}/health`);
    expect(req.request.method).toBe('GET');
    req.flush({ status: 'ok', time: '2026-01-01T00:00:00+00:00' });

    expect(response?.status).toBe('ok');
  });

  // ─── Config ───────────────────────────────────────────────────────

  it('loadConfig: parses response and fills defaults for missing arrays', () => {
    let cfg: CotasSiteConfig | undefined;
    service.loadConfig().subscribe(c => (cfg = c));

    const req = http.expectOne(`${BASE}/config`);
    expect(req.request.method).toBe('GET');
    req.flush({
      phone: '04321 1 49 00',
      // enforce_* fehlen absichtlich
    });

    expect(cfg?.phone).toBe('04321 1 49 00');
    // Defaults wenn nicht im Body:
    expect(cfg?.enforce_no_partner_categories).toEqual([]);
    expect(cfg?.enforce_partner_target_groups).toEqual([]);
  });

  // ─── Dance Classes ────────────────────────────────────────────────

  it('listDanceClasses: GET /danceclasses', () => {
    service.listDanceClasses().subscribe();
    const req = http.expectOne(`${BASE}/danceclasses`);
    expect(req.request.method).toBe('GET');
    req.flush({ target_groups: [], dance_classes: {} });
  });

  it('listDanceClassesFiltered: query params kategorie+zielgruppe', () => {
    service.listDanceClassesFiltered('CAT-1', 'ZG-1').subscribe();
    const req = http.expectOne(
      r =>
        r.url === `${BASE}/danceclasses` &&
        r.params.get('kategorie') === 'CAT-1' &&
        r.params.get('zielgruppe') === 'ZG-1',
    );
    req.flush({});
  });

  it('listDanceClassesFiltered: defaultet leere IDs auf "0"', () => {
    service.listDanceClassesFiltered('', '').subscribe();
    const req = http.expectOne(
      r => r.params.get('kategorie') === '0' && r.params.get('zielgruppe') === '0',
    );
    req.flush({});
  });

  // ─── normalize-Catalog Verhalten ──────────────────────────────────

  it('loadCatalog: flacht verschachtelte dance_classes und filtert vergangene Nicht-Club-Kurse raus', () => {
    let cat: ReturnType<typeof Object> | undefined;
    service.loadCatalog().subscribe(c => (cat = c));

    const mkClass = (over: Partial<CotasDanceClass>): CotasDanceClass =>
      ({
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
        zielgruppen_bez: '',
        zielgruppen_priority: '1',
        kategorie_id: 'CAT-1',
        kategorie_bez: 'Kategorie 1',
        kategorie_priority: '5',
        tag: 'Montag',
        kurs_beginn: '',
        tmpl_kurs_beginn: '',
        start: '20:00:00',
        ende: '21:00:00',
        tmpl_start: '20:00',
        einheiten: '8',
        terminrhythmus: '1',
        next_date: null,
        honorar: '0.00',
        umsatzsteuerfrei: '',
        kursleiter: '',
        assistent: '',
        info_text: '',
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
      }) as CotasDanceClass;

    const resp: CotasDanceClassesResponse = {
      target_groups: [
        { id: 'ZG-A', name: 'A', bez: 'A', beschreibung: '', priority: 1, active: 'active' },
      ],
      dance_classes: {
        'ZG-A': [
          [
            // Zukunftsdatum + non-club -> bleibt
            mkClass({
              id: '1',
              kurs_bez: 'B Klasse',
              kategorie_priority: '10',
              kurs_beginn: '2999-01-01',
            }),
            // Vergangenheit + non-club -> rausfliegen
            mkClass({
              id: '2',
              kurs_bez: 'Alt',
              kurs_beginn: '2020-05-01',
              kzclub: '0',
            }),
            // Vergangenheit + club -> bleibt (Clubs laufen dauerhaft)
            mkClass({
              id: '3',
              kurs_bez: 'Club',
              kurs_beginn: '2015-01-01',
              kzclub: '1',
            }),
          ],
          [
            mkClass({
              id: '4',
              kurs_bez: 'A Klasse',
              kategorie_priority: '5',
              kurs_beginn: '2999-01-01',
            }),
          ],
        ],
      },
    };

    const req = http.expectOne(`${BASE}/danceclasses`);
    req.flush(resp);

    // 1 + 3 + 4 bleiben uebrig (id=2 = vergangenes Nicht-Club-Kursdatum)
    const flat = cat?.['classesByGroup'].get('ZG-A') ?? [];
    expect(flat).toHaveLength(3);
    expect(flat.find((c: CotasDanceClass) => c.id === '2')).toBeUndefined();

    // Sortierung nach kategorie_priority ASC, dann kurs_bez
    expect(flat[0].id).toBe('4'); // priority 5
  });

  // ─── Registration ─────────────────────────────────────────────────

  it('previewRegistration: query param id + optionale partner/debit_charge', () => {
    service.previewRegistration('22', { partner: 1, debit_charge: 1 }).subscribe();
    const req = http.expectOne(
      r =>
        r.url === `${BASE}/registrations/preview` &&
        r.params.get('id') === '22' &&
        r.params.get('partner') === '1' &&
        r.params.get('debit_charge') === '1',
    );
    req.flush({});
  });

  it('submitRegistration: POST /registrations mit Body', () => {
    const payload = {
      id: '22',
      kurskennung: 'K-1',
      vertrag_id: '99',
      anrede: 1,
      vorname: 'Max',
      nachname: 'Muster',
      strasse: 'Hauptstr.',
      hausnummer: '1',
      plz: '24534',
      stadt: 'Neumuenster',
      email: 'm@example.com',
      telefon: '04321',
      geburtstag: '15.01.2000',
      partner: 0 as const,
      checked: 1 as const,
    };
    service.submitRegistration(payload).subscribe();
    const req = http.expectOne(`${BASE}/registrations`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({});
  });

  it('confirmRegistration: GET mit session param', () => {
    service.confirmRegistration('abc123').subscribe();
    const req = http.expectOne(
      r => r.url === `${BASE}/registrations/confirm` && r.params.get('session') === 'abc123',
    );
    req.flush({});
  });

  // ─── Vouchers ─────────────────────────────────────────────────────

  it('listVouchers: GET /vouchers, mapped auf vouchers Array', () => {
    let vouchers: readonly CotasVoucher[] | undefined;
    service.listVouchers().subscribe(v => (vouchers = v));

    const req = http.expectOne(`${BASE}/vouchers`);
    expect(req.request.method).toBe('GET');
    req.flush({
      vouchers: [
        { id: '1', path: 'a.jpg', thumbnailUrl: 'http://x/small_a.jpg', imageUrl: 'http://x/a.jpg' },
      ],
    });

    expect(vouchers).toHaveLength(1);
    expect(vouchers?.[0].id).toBe('1');
  });

  it('listVouchers: liefert leere Liste wenn Response leer', () => {
    let vouchers: readonly CotasVoucher[] | undefined;
    service.listVouchers().subscribe(v => (vouchers = v));
    http.expectOne(`${BASE}/vouchers`).flush({});
    expect(vouchers).toEqual([]);
  });

  it('getVoucher: GET /vouchers/{id} URL-encoded, mapped auf voucher Objekt', () => {
    let v: CotasVoucher | null | undefined;
    service.getVoucher('22').subscribe(r => (v = r));
    const req = http.expectOne(`${BASE}/vouchers/22`);
    req.flush({ voucher: { id: '22', path: 'p.jpg', thumbnailUrl: 't', imageUrl: 'i' } });
    expect(v?.id).toBe('22');
  });

  it('getVoucher: gibt null wenn voucher fehlt', () => {
    let v: CotasVoucher | null | undefined;
    service.getVoucher('22').subscribe(r => (v = r));
    http.expectOne(`${BASE}/vouchers/22`).flush({});
    expect(v).toBeNull();
  });

  it('orderVoucher: POST /voucher-orders', () => {
    const payload = {
      voucher_id: '22',
      selbstausdruck: 1 as const,
      name: 'X',
      betrag: '50',
      checked: 1 as const,
      anrede: 1,
      vorname: 'V',
      nachname: 'N',
      strasse: 'S',
      hausnummer: '1',
      plz: '24534',
      stadt: 'NMS',
      email: 'a@b.c',
      vorwahl: '-',
      telefon: '-',
      inhaber: 'I',
      iban: 'DE...',
      bic: 'BIC',
    };
    service.orderVoucher(payload).subscribe();
    const req = http.expectOne(`${BASE}/voucher-orders`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({});
  });

  it('voucherPrintUrl: baut URL mit encoded session', () => {
    expect(service.voucherPrintUrl('abc 123')).toBe(
      `${BASE}/voucher-orders/print?session=abc%20123`,
    );
  });

  it('confirmVoucherOrder: GET /voucher-orders/confirm mit session', () => {
    service.confirmVoucherOrder('s1').subscribe();
    const req = http.expectOne(
      r =>
        r.url === `${BASE}/voucher-orders/confirm` && r.params.get('session') === 's1',
    );
    req.flush({});
  });
});
