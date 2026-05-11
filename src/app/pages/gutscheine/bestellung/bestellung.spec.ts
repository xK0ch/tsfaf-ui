import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { Bestellung } from './bestellung';
import { CotasApiService } from '../../../core/services/cotas-api.service';
import { CotasVoucher, VoucherOrderPayload } from '../../../core/models/cotas.models';

const VOUCHER: CotasVoucher = {
  id: '22',
  path: 'v22.jpg',
  thumbnailUrl: 'http://x/small_v22.jpg',
  imageUrl: 'http://x/v22.jpg',
};

interface AccessibleForm {
  invalid: boolean;
  patchValue(v: Record<string, unknown>): void;
  controls: {
    vorwahl: { invalid: boolean; hasError(k: string): boolean };
    telefon: { invalid: boolean; hasError(k: string): boolean };
    betrag: { invalid: boolean; hasError(k: string): boolean };
  };
}

describe('Bestellung (Gutschein)', () => {
  let submitCapture: { payload?: VoucherOrderPayload } = {};

  function setup() {
    submitCapture = {};
    const apiMock = {
      getVoucher: () => of(VOUCHER),
      orderVoucher: (p: VoucherOrderPayload) => {
        submitCapture.payload = p;
        return of({ ok: 1, session: 's-1' });
      },
    };
    TestBed.configureTestingModule({
      imports: [Bestellung],
      providers: [
        provideRouter([]),
        { provide: CotasApiService, useValue: apiMock },
        { provide: ActivatedRoute, useValue: { params: of({ id: '22' }) } },
      ],
    });
    const fixture = TestBed.createComponent(Bestellung);
    fixture.detectChanges();
    return fixture;
  }

  function fillAll(form: AccessibleForm): void {
    form.patchValue({
      name: 'Maria',
      betrag: '50',
      bemerkung: 'Alles Gute',
      selbstausdruck: 1,
      anrede: 1,
      vorname: 'V',
      nachname: 'N',
      strasse: 'S',
      hausnummer: '1',
      plz: '24534',
      stadt: 'NMS',
      email: 'a@b.c',
      vorwahl: '',
      telefon: '',
      inhaber: 'I',
      iban: 'DE111',
      bic: 'BIC',
      checked: true,
    });
  }

  it('Form initial invalid', () => {
    const fixture = setup();
    const cmp = fixture.componentInstance as unknown as { form: AccessibleForm };
    expect(cmp.form.invalid).toBe(true);
  });

  it('Form valid wenn alle Pflichtfelder gefuellt, Vorwahl+Telefon leer (beide optional)', () => {
    const fixture = setup();
    const cmp = fixture.componentInstance as unknown as { form: AccessibleForm };
    fillAll(cmp.form);
    expect(cmp.form.invalid).toBe(false);
  });

  it('Cross-Validator: nur Vorwahl gefuellt -> Telefon invalid', () => {
    const fixture = setup();
    const cmp = fixture.componentInstance as unknown as { form: AccessibleForm };
    fillAll(cmp.form);
    cmp.form.patchValue({ vorwahl: '04321' });
    fixture.detectChanges();
    expect(cmp.form.controls.telefon.invalid).toBe(true);
    expect(cmp.form.controls.telefon.hasError('requiredWithSibling')).toBe(true);
    expect(cmp.form.invalid).toBe(true);
  });

  it('Cross-Validator: beide Felder gefuellt -> valid', () => {
    const fixture = setup();
    const cmp = fixture.componentInstance as unknown as { form: AccessibleForm };
    fillAll(cmp.form);
    cmp.form.patchValue({ vorwahl: '04321', telefon: '14900' });
    fixture.detectChanges();
    expect(cmp.form.controls.vorwahl.invalid).toBe(false);
    expect(cmp.form.controls.telefon.invalid).toBe(false);
    expect(cmp.form.invalid).toBe(false);
  });

  it('Betrag-Validator: leere/negative/text-Werte sind invalid', () => {
    const fixture = setup();
    const cmp = fixture.componentInstance as unknown as { form: AccessibleForm };
    fillAll(cmp.form);

    cmp.form.patchValue({ betrag: '' });
    expect(cmp.form.controls.betrag.invalid).toBe(true);

    cmp.form.patchValue({ betrag: '-5' });
    expect(cmp.form.controls.betrag.invalid).toBe(true);
    expect(cmp.form.controls.betrag.hasError('betragInvalid')).toBe(true);

    cmp.form.patchValue({ betrag: 'abc' });
    expect(cmp.form.controls.betrag.invalid).toBe(true);

    cmp.form.patchValue({ betrag: '50,00' });
    expect(cmp.form.controls.betrag.invalid).toBe(false);

    cmp.form.patchValue({ betrag: '50' });
    expect(cmp.form.controls.betrag.invalid).toBe(false);
  });

  it('submit: vorwahl+telefon beide leer -> Sentinel "-" im Payload', () => {
    const fixture = setup();
    const cmp = fixture.componentInstance as unknown as {
      form: AccessibleForm;
      submit(): void;
    };
    fillAll(cmp.form);
    cmp.submit();
    expect(submitCapture.payload).toBeDefined();
    expect(submitCapture.payload!.vorwahl).toBe('-');
    expect(submitCapture.payload!.telefon).toBe('-');
    expect(submitCapture.payload!.voucher_id).toBe('22');
    expect(submitCapture.payload!.selbstausdruck).toBe(1);
    expect(submitCapture.payload!.lastschrift).toBe(1);
    expect(submitCapture.payload!.checked).toBe(1);
  });

  it('submit: vorwahl+telefon beide gefuellt -> Werte im Payload', () => {
    const fixture = setup();
    const cmp = fixture.componentInstance as unknown as {
      form: AccessibleForm;
      submit(): void;
    };
    fillAll(cmp.form);
    cmp.form.patchValue({ vorwahl: '04321', telefon: '14900' });
    cmp.submit();
    expect(submitCapture.payload?.vorwahl).toBe('04321');
    expect(submitCapture.payload?.telefon).toBe('14900');
  });

  it('Bemerkung maxlength 160: laenger schlaegt im Validator durch (HTML clamped zusaetzlich)', () => {
    const fixture = setup();
    const cmp = fixture.componentInstance as unknown as {
      form: {
        controls: { bemerkung: { hasError(k: string): boolean; setValue(v: string): void } };
      };
    };
    cmp.form.controls.bemerkung.setValue('x'.repeat(161));
    expect(cmp.form.controls.bemerkung.hasError('maxlength')).toBe(true);
    cmp.form.controls.bemerkung.setValue('x'.repeat(160));
    expect(cmp.form.controls.bemerkung.hasError('maxlength')).toBe(false);
  });
});
