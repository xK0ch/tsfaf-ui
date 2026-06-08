import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { Anmeldung } from './anmeldung';
import { CotasApiService } from '../../../core/services/cotas-api.service';
import {
  CotasContract,
  CotasDanceClass,
  RegistrationSubmitPayload,
} from '../../../core/models/cotas.models';

function mkClass(over: Partial<CotasDanceClass> = {}): CotasDanceClass {
  return {
    id: '22',
    kurskennung: 'KK-22',
    kurs_bez: 'Test-Kurs',
    kurs_nr: '',
    saison: '',
    jahr: '',
    standort: '',
    saal_bez: '',
    kzclub: '0',
    zielgruppen_id: 'ZG-A',
    zielgruppen_bez: 'A',
    zielgruppen_priority: '1',
    kategorie_id: 'CAT-1',
    kategorie_bez: 'C1',
    kategorie_priority: '5',
    tag: 'Mo',
    kurs_beginn: '',
    tmpl_kurs_beginn: '',
    start: '',
    ende: '',
    tmpl_start: '',
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
  } as CotasDanceClass;
}

describe('Anmeldung', () => {
  let submitCapture: { payload?: RegistrationSubmitPayload } = {};

  function setup() {
    submitCapture = {};
    const contracts: CotasContract[] = [
      { id: '99', kurskennung: 'KK-22', bezeichnung: 'Normal', zahlbetrag: '96.00' },
    ];
    const apiMock = {
      previewRegistration: () =>
        of({
          dance_class: mkClass(),
          contracts,
          partner: 0,
          same_bank: 1,
          debit_charge: 0,
        }),
      loadConfig: () =>
        of({
          no_online_registration: [],
          infotexts: [],
          enforce_no_partner_categories: [],
          enforce_partner_target_groups: [],
          phone: '04321',
        }),
      submitRegistration: (p: RegistrationSubmitPayload) => {
        submitCapture.payload = p;
        return of({ errors: false });
      },
    };
    TestBed.configureTestingModule({
      imports: [Anmeldung],
      providers: [
        provideRouter([]),
        { provide: CotasApiService, useValue: apiMock },
        { provide: ActivatedRoute, useValue: { params: of({ id: '22' }) } },
      ],
    });
    const fixture = TestBed.createComponent(Anmeldung);
    fixture.detectChanges();
    return fixture;
  }

  function fillRequiredFields(form: Record<string, unknown>): void {
    const ctrls = form as unknown as {
      patchValue(v: Record<string, unknown>): void;
    };
    ctrls.patchValue({
      vertrag_id: 99,
      partner: 2, // alleine
      anrede: 1,
      vorname: 'Maria',
      nachname: 'Muster',
      geburtstag: '2000-01-15',
      strasse: 'Hauptstr.',
      hausnummer: '1',
      plz: '24534',
      stadt: 'NMS',
      telefon: '04321 14900',
      email: 'maria@example.com',
      // Standard-Auswahl fuer Tests, die Zahlungsart-Logik nicht testen:
      // "cash" reicht aus damit das Pflichtfeld payment gefuellt ist und
      // keine Bankdaten erfordert werden.
      payment: 'cash',
      checked: true,
    });
  }

  it('Form ist initial invalid', () => {
    const fixture = setup();
    const cmp = fixture.componentInstance as unknown as { form: { invalid: boolean } };
    expect(cmp.form.invalid).toBe(true);
  });

  it('Form wird valide wenn alle Pflichtfelder gefuellt (partner=alleine, ohne SEPA)', () => {
    const fixture = setup();
    const cmp = fixture.componentInstance as unknown as { form: { invalid: boolean } };
    fillRequiredFields(cmp.form);
    expect(cmp.form.invalid).toBe(false);
  });

  it('payment=sepa erzwingt iban/bic/inhaber', () => {
    const fixture = setup();
    const cmp = fixture.componentInstance as unknown as {
      form: {
        invalid: boolean;
        patchValue(v: Record<string, unknown>): void;
        controls: { iban: { invalid: boolean }; bic: { invalid: boolean }; inhaber: { invalid: boolean } };
      };
    };
    fillRequiredFields(cmp.form as unknown as Record<string, unknown>);
    cmp.form.patchValue({ payment: 'sepa' });
    fixture.detectChanges();
    expect(cmp.form.controls.iban.invalid).toBe(true);
    expect(cmp.form.controls.bic.invalid).toBe(true);
    expect(cmp.form.controls.inhaber.invalid).toBe(true);

    cmp.form.patchValue({ iban: 'DE111', bic: 'BIC', inhaber: 'Max' });
    fixture.detectChanges();
    expect(cmp.form.invalid).toBe(false);
  });

  it('payment ist Pflichtfeld — leer = form invalid', () => {
    const fixture = setup();
    const cmp = fixture.componentInstance as unknown as {
      form: {
        invalid: boolean;
        patchValue(v: Record<string, unknown>): void;
        controls: { payment: { invalid: boolean; hasError(k: string): boolean } };
      };
    };
    fillRequiredFields(cmp.form as unknown as Record<string, unknown>);
    cmp.form.patchValue({ payment: '' });
    fixture.detectChanges();
    expect(cmp.form.controls.payment.invalid).toBe(true);
    expect(cmp.form.controls.payment.hasError('required')).toBe(true);
    expect(cmp.form.invalid).toBe(true);
  });

  it('paymentReference baut "Kursanmeldung <Name> · <Kurs> · <Datum>" aus Form + Course', () => {
    const fixture = setup();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      form: { patchValue(v: Record<string, unknown>): void };
      paymentReference: { (): string };
    };
    fillRequiredFields(cmp.form as unknown as Record<string, unknown>);
    fixture.detectChanges();

    const ref = cmp.paymentReference();
    // mkClass() liefert kurs_bez 'GK1' und tmpl_kurs_beginn (Default-Wert
    // im Mock); fillRequiredFields setzt Vorname Maria, Nachname Muster.
    expect(ref).toContain('Kursanmeldung Maria Muster');
    expect(ref).toContain('·');
    // Wenn Vorname leer → "Vorname Nachname" Platzhalter
    cmp.form.patchValue({ vorname: '', nachname: '' });
    fixture.detectChanges();
    expect(cmp.paymentReference()).toContain('Vorname Nachname');
  });

  it('payment=transfer: kein SEPA-Validation, keine Bankdaten verlangt', () => {
    const fixture = setup();
    const cmp = fixture.componentInstance as unknown as {
      form: {
        invalid: boolean;
        patchValue(v: Record<string, unknown>): void;
        controls: { iban: { invalid: boolean }; bic: { invalid: boolean }; inhaber: { invalid: boolean } };
      };
    };
    fillRequiredFields(cmp.form as unknown as Record<string, unknown>);
    cmp.form.patchValue({ payment: 'transfer' });
    fixture.detectChanges();
    expect(cmp.form.controls.iban.invalid).toBe(false);
    expect(cmp.form.controls.bic.invalid).toBe(false);
    expect(cmp.form.controls.inhaber.invalid).toBe(false);
    expect(cmp.form.invalid).toBe(false);
  });

  it('partner=1 (mit Partner) erzwingt alle p_* Felder', () => {
    const fixture = setup();
    const cmp = fixture.componentInstance as unknown as {
      form: {
        invalid: boolean;
        patchValue(v: Record<string, unknown>): void;
        controls: { p_vorname: { invalid: boolean }; p_nachname: { invalid: boolean } };
      };
    };
    fillRequiredFields(cmp.form as unknown as Record<string, unknown>);
    cmp.form.patchValue({ partner: 1 });
    fixture.detectChanges();
    expect(cmp.form.invalid).toBe(true);
    expect(cmp.form.controls.p_vorname.invalid).toBe(true);

    cmp.form.patchValue({
      p_anrede: 2,
      p_vorname: 'Anna',
      p_nachname: 'Beispiel',
      p_strasse: 'Foo',
      p_hausnummer: '2',
      p_plz: '24534',
      p_stadt: 'NMS',
      p_geburtstag: '2001-02-20',
      p_telefon: '04321',
      p_email: 'anna@example.com',
    });
    fixture.detectChanges();
    expect(cmp.form.invalid).toBe(false);
  });

  it('submit baut korrekten Payload: telefon Sentinel "-" wenn leer, Geburtstag in DE-Format', () => {
    const fixture = setup();
    const cmp = fixture.componentInstance as unknown as {
      form: { patchValue(v: Record<string, unknown>): void };
      submit(): void;
    };
    fillRequiredFields(cmp.form as unknown as Record<string, unknown>);
    cmp.form.patchValue({ telefon: '' });
    cmp.submit();

    expect(submitCapture.payload).toBeDefined();
    expect(submitCapture.payload!.telefon).toBe('-');
    expect(submitCapture.payload!.geburtstag).toBe('15.01.2000');
    expect(submitCapture.payload!.partner).toBe(2);
    expect(submitCapture.payload!.kurskennung).toBe('KK-22');
    expect(submitCapture.payload!.vertrag_id).toBe('99');
    expect(submitCapture.payload!.checked).toBe(1);
    expect(submitCapture.payload!.debit_charge).toBeUndefined();
  });

  it('payment=sepa -> debit_charge=1 im Payload, keine Bemerkung-Marker', () => {
    const fixture = setup();
    const cmp = fixture.componentInstance as unknown as {
      form: { patchValue(v: Record<string, unknown>): void };
      submit(): void;
    };
    fillRequiredFields(cmp.form as unknown as Record<string, unknown>);
    cmp.form.patchValue({
      payment: 'sepa',
      iban: 'DE111',
      bic: 'BIC',
      inhaber: 'Maria Muster',
    });
    cmp.submit();
    expect(submitCapture.payload!.debit_charge).toBe(1);
    expect(submitCapture.payload!.bemerkung).toBe('');
  });

  it('payment=transfer -> debit_charge NICHT im Payload + Bemerkung-Marker', () => {
    const fixture = setup();
    const cmp = fixture.componentInstance as unknown as {
      form: { patchValue(v: Record<string, unknown>): void };
      submit(): void;
    };
    fillRequiredFields(cmp.form as unknown as Record<string, unknown>);
    cmp.form.patchValue({ payment: 'transfer' });
    cmp.submit();
    expect(submitCapture.payload!.debit_charge).toBeUndefined();
    expect(submitCapture.payload!.iban).toBeUndefined();
    expect(submitCapture.payload!.bic).toBeUndefined();
    expect(submitCapture.payload!.inhaber).toBeUndefined();
    expect(submitCapture.payload!.bemerkung).toContain('[Zahlung per Überweisung gewünscht]');
  });

  it('payment=cash -> debit_charge NICHT im Payload + Bemerkung-Marker', () => {
    const fixture = setup();
    const cmp = fixture.componentInstance as unknown as {
      form: { patchValue(v: Record<string, unknown>): void };
      submit(): void;
    };
    fillRequiredFields(cmp.form as unknown as Record<string, unknown>);
    cmp.form.patchValue({ payment: 'cash' });
    cmp.submit();
    expect(submitCapture.payload!.debit_charge).toBeUndefined();
    expect(submitCapture.payload!.iban).toBeUndefined();
    expect(submitCapture.payload!.bemerkung).toContain('[Zahlung vor Ort gewünscht]');
  });

  it('payment-Marker wird an Kunden-Bemerkung angehaengt, nicht ueberschrieben', () => {
    const fixture = setup();
    const cmp = fixture.componentInstance as unknown as {
      form: { patchValue(v: Record<string, unknown>): void };
      submit(): void;
    };
    fillRequiredFields(cmp.form as unknown as Record<string, unknown>);
    cmp.form.patchValue({ payment: 'cash', bemerkung: 'Bitte Saal 2' });
    cmp.submit();
    const b = submitCapture.payload!.bemerkung as string;
    expect(b).toContain('Bitte Saal 2');
    expect(b).toContain('[Zahlung vor Ort gewünscht]');
    // Reihenfolge: Kunden-Text vor Marker
    expect(b.indexOf('Bitte Saal 2')).toBeLessThan(b.indexOf('['));
  });

  it('mobil im Payload: leer wenn nicht ausgefuellt, Wert wenn gesetzt', () => {
    const fixture = setup();
    const cmp = fixture.componentInstance as unknown as {
      form: { patchValue(v: Record<string, unknown>): void };
      submit(): void;
    };

    // Variante 1: kein mobil eingetragen → leerer String
    fillRequiredFields(cmp.form as unknown as Record<string, unknown>);
    cmp.submit();
    expect(submitCapture.payload).toBeDefined();
    expect(submitCapture.payload!.mobil).toBe('');

    // Variante 2: mobil eingetragen → trim und drin
    fillRequiredFields(cmp.form as unknown as Record<string, unknown>);
    cmp.form.patchValue({ mobil: '  0151 1234567  ' });
    cmp.submit();
    expect(submitCapture.payload!.mobil).toBe('0151 1234567');
  });

  it('mobil ungueltig (Buchstaben) -> form invalid', () => {
    const fixture = setup();
    const cmp = fixture.componentInstance as unknown as {
      form: {
        invalid: boolean;
        patchValue(v: Record<string, unknown>): void;
        controls: { mobil: { invalid: boolean } };
      };
    };
    fillRequiredFields(cmp.form as unknown as Record<string, unknown>);
    cmp.form.patchValue({ mobil: 'abc' });
    expect(cmp.form.controls.mobil.invalid).toBe(true);
    expect(cmp.form.invalid).toBe(true);
  });

  it('partner=1: p_mobil ist optional, p_mobil-Pattern greift wenn ausgefuellt', () => {
    const fixture = setup();
    const cmp = fixture.componentInstance as unknown as {
      form: {
        invalid: boolean;
        patchValue(v: Record<string, unknown>): void;
        controls: { p_mobil: { invalid: boolean } };
      };
      submit(): void;
    };
    fillRequiredFields(cmp.form as unknown as Record<string, unknown>);
    cmp.form.patchValue({
      partner: 1,
      p_anrede: 2,
      p_vorname: 'Anna',
      p_nachname: 'Beispiel',
      p_strasse: 'Foo',
      p_hausnummer: '2',
      p_plz: '24534',
      p_stadt: 'NMS',
      p_geburtstag: '2001-02-20',
      p_email: 'anna@example.com',
      p_mobil: '0151 9876543',
    });
    fixture.detectChanges();
    expect(cmp.form.invalid).toBe(false);

    cmp.submit();
    expect(submitCapture.payload!.p_mobil).toBe('0151 9876543');
  });

  it('submit mit Server-Validation-Errors markiert betroffene Felder', () => {
    const apiMock = {
      previewRegistration: () => of({ dance_class: mkClass(), contracts: [] }),
      loadConfig: () =>
        of({
          no_online_registration: [],
          infotexts: [],
          enforce_no_partner_categories: [],
          enforce_partner_target_groups: [],
          phone: '04321',
        }),
      submitRegistration: () => of({ errors: true, err_email: 1 }),
    };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [Anmeldung],
      providers: [
        provideRouter([]),
        { provide: CotasApiService, useValue: apiMock },
        { provide: ActivatedRoute, useValue: { params: of({ id: '22' }) } },
      ],
    });
    const fixture = TestBed.createComponent(Anmeldung);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      form: { patchValue(v: Record<string, unknown>): void; controls: { email: { errors: unknown } } };
      submit(): void;
      invalidServerFields: { (): readonly string[] };
      step: { (): string };
    };
    fillRequiredFields(cmp.form as unknown as Record<string, unknown>);
    cmp.submit();
    expect(cmp.invalidServerFields()).toContain('email');
    expect(cmp.step()).toBe('error');
  });

  // ─── Abo (kzclub) ───────────────────────────────────────────────
  //
  // Eigene Setup-Helfer um den Kurs flexibel zu definieren: die Standard-
  // setup()-Funktion fixiert das Cotas-mkClass(), aber fuer diese Tests
  // brauchen wir verschiedene kzclub/Datum-Kombis pro Test.

  function setupWithClass(over: Partial<CotasDanceClass>) {
    const contracts: CotasContract[] = [
      { id: '99', kurskennung: 'KK-22', bezeichnung: 'Normal', zahlbetrag: '96.00' },
    ];
    const apiMock = {
      previewRegistration: () =>
        of({
          dance_class: mkClass(over),
          contracts,
          partner: 0,
          same_bank: 1,
          debit_charge: 0,
        }),
      loadConfig: () =>
        of({
          no_online_registration: [],
          infotexts: [],
          enforce_no_partner_categories: [],
          enforce_partner_target_groups: [],
          phone: '04321',
        }),
      submitRegistration: () => of({ errors: false }),
    };
    TestBed.configureTestingModule({
      imports: [Anmeldung],
      providers: [
        provideRouter([]),
        { provide: CotasApiService, useValue: apiMock },
        { provide: ActivatedRoute, useValue: { params: of({ id: '22' }) } },
      ],
    });
    const fixture = TestBed.createComponent(Anmeldung);
    fixture.detectChanges();
    return fixture;
  }

  it('isAboCourse: gibt true fuer kzclub=1, false sonst', () => {
    const aboFix = setupWithClass({ kzclub: '1' });
    const aboCmp = aboFix.componentInstance as unknown as {
      isAboCourse: { (): boolean };
    };
    expect(aboCmp.isAboCourse()).toBe(true);

    TestBed.resetTestingModule();
    const kursFix = setupWithClass({ kzclub: '0' });
    const kursCmp = kursFix.componentInstance as unknown as {
      isAboCourse: { (): boolean };
    };
    expect(kursCmp.isAboCourse()).toBe(false);
  });

  it('Template versteckt die "Beginn:"-Zeile bei Abo-Kursen', () => {
    const fixture = setupWithClass({
      kzclub: '1',
      tmpl_kurs_beginn: '13.08.2019',
    });
    const el = fixture.nativeElement as HTMLElement;
    // Im Summary-Block der Anmeldungs-Uebersicht darf kein "Beginn:"
    // mehr auftauchen, weil Abos kein sinnvolles Startdatum haben.
    const summary = el.querySelector('.summary-list');
    expect(summary?.textContent).not.toContain('Beginn:');
    expect(summary?.textContent).not.toContain('13.08.2019');
  });

  it('Template zeigt "Beginn:" bei Kursen mit gepflegtem Datum', () => {
    const fixture = setupWithClass({
      kzclub: '0',
      tmpl_kurs_beginn: '15.06.2026',
    });
    const el = fixture.nativeElement as HTMLElement;
    const summary = el.querySelector('.summary-list');
    expect(summary?.textContent).toContain('Beginn:');
    expect(summary?.textContent).toContain('15.06.2026');
  });

  it('Template versteckt "Beginn:" bei Kursen ohne gepflegtes Datum', () => {
    const fixture = setupWithClass({
      kzclub: '0',
      tmpl_kurs_beginn: '',
    });
    const el = fixture.nativeElement as HTMLElement;
    const summary = el.querySelector('.summary-list');
    expect(summary?.textContent).not.toContain('Beginn:');
  });

  it('paymentReference enthaelt Datum bei Kurs mit Datum', () => {
    const fixture = setupWithClass({
      kzclub: '0',
      kurs_bez: 'Discofox',
      tmpl_kurs_beginn: '15.06.2026',
    });
    const cmp = fixture.componentInstance as unknown as {
      form: { patchValue(v: Record<string, unknown>): void };
      paymentReference: { (): string };
    };
    cmp.form.patchValue({ vorname: 'Max', nachname: 'Muster' });
    fixture.detectChanges();
    const ref = cmp.paymentReference();
    expect(ref).toContain('Discofox');
    expect(ref).toContain('15.06.2026');
  });

  it('paymentReference laesst Datum bei Abo-Kursen weg', () => {
    const fixture = setupWithClass({
      kzclub: '1',
      kurs_bez: 'Tanz-Club',
      tmpl_kurs_beginn: '13.08.2019',
    });
    const cmp = fixture.componentInstance as unknown as {
      form: { patchValue(v: Record<string, unknown>): void };
      paymentReference: { (): string };
    };
    cmp.form.patchValue({ vorname: 'Max', nachname: 'Muster' });
    fixture.detectChanges();
    const ref = cmp.paymentReference();
    expect(ref).toContain('Tanz-Club');
    expect(ref).not.toContain('13.08.2019');
  });

  it('paymentReference laesst Datum auch bei Kurs ohne gepflegtes Datum weg', () => {
    const fixture = setupWithClass({
      kzclub: '0',
      kurs_bez: 'Discofox',
      tmpl_kurs_beginn: '',
    });
    const cmp = fixture.componentInstance as unknown as {
      form: { patchValue(v: Record<string, unknown>): void };
      paymentReference: { (): string };
    };
    cmp.form.patchValue({ vorname: 'Max', nachname: 'Muster' });
    fixture.detectChanges();
    const ref = cmp.paymentReference();
    expect(ref).toContain('Discofox');
    expect(ref).not.toContain('Kursdatum');
  });
});
