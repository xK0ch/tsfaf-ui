import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';

import { Kontakt } from './kontakt';
import {
  KontaktApiService,
  type KontaktFormPayload,
  type KontaktResult,
} from '../../core/services/kontakt-api.service';

interface ApiCall {
  payload: KontaktFormPayload;
}

function makeApiMock(stubResult: KontaktResult | Subject<KontaktResult>) {
  const calls: ApiCall[] = [];
  return {
    send: (payload: KontaktFormPayload) => {
      calls.push({ payload });
      return stubResult instanceof Subject ? stubResult.asObservable() : of(stubResult);
    },
    get calls(): readonly ApiCall[] {
      return calls;
    },
  };
}

interface KontaktCmp {
  step: { (): 'form' | 'loading' | 'success' | 'error' };
  form: {
    setValue(v: Record<string, unknown>): void;
    get(name: string): { setValue(v: unknown): void } | null;
    invalid: boolean;
    valid: boolean;
  };
  submit(): void;
  resetForm(): void;
  backToForm(): void;
}

describe('Kontakt', () => {
  function setup(stubResult: KontaktResult | Subject<KontaktResult>) {
    const apiMock = makeApiMock(stubResult);
    TestBed.configureTestingModule({
      imports: [Kontakt],
      providers: [
        provideRouter([]),
        { provide: KontaktApiService, useValue: apiMock },
      ],
    });
    const fixture = TestBed.createComponent(Kontakt);
    fixture.detectChanges();
    return { fixture, apiMock };
  }

  function fillValidForm(cmp: KontaktCmp): void {
    cmp.form.setValue({
      name: 'Max Mustermann',
      email: 'max@example.com',
      phone: '0152 1234567',
      subject: 'kurs',
      message: 'Wann ist der naechste Anfaengerkurs?',
      datenschutz: true,
    });
  }

  // ─── Submit-Flow: Success ──────────────────────────────────────

  it('valides Formular -> step wechselt zu loading dann success', () => {
    const result$ = new Subject<KontaktResult>();
    const { fixture, apiMock } = setup(result$);
    const cmp = fixture.componentInstance as unknown as KontaktCmp;

    fillValidForm(cmp);
    cmp.submit();

    expect(cmp.step()).toBe('loading');
    expect(apiMock.calls.length).toBe(1);
    expect(apiMock.calls[0].payload).toMatchObject({
      name: 'Max Mustermann',
      email: 'max@example.com',
      subject: 'kurs',
      datenschutz: true,
    });

    result$.next({ kind: 'sent' });
    expect(cmp.step()).toBe('success');
  });

  it('valides Formular schickt honeypot leeres Feld mit', () => {
    const { fixture, apiMock } = setup({ kind: 'sent' });
    const cmp = fixture.componentInstance as unknown as KontaktCmp;
    fillValidForm(cmp);
    cmp.submit();
    expect(apiMock.calls[0].payload.honeypot).toBe('');
  });

  // ─── Submit-Flow: Error ─────────────────────────────────────────

  it('Network-Fehler -> step wechselt zu error', () => {
    const { fixture } = setup({ kind: 'network' });
    const cmp = fixture.componentInstance as unknown as KontaktCmp;
    fillValidForm(cmp);
    cmp.submit();
    expect(cmp.step()).toBe('error');
  });

  it('Server-Validation-Fehler -> step wechselt zu error', () => {
    const { fixture } = setup({ kind: 'validation', field: 'email' });
    const cmp = fixture.componentInstance as unknown as KontaktCmp;
    fillValidForm(cmp);
    cmp.submit();
    expect(cmp.step()).toBe('error');
  });

  it('backToForm setzt step von error zurueck auf form, Werte bleiben erhalten', () => {
    const { fixture } = setup({ kind: 'network' });
    const cmp = fixture.componentInstance as unknown as KontaktCmp;
    fillValidForm(cmp);
    cmp.submit();
    expect(cmp.step()).toBe('error');
    cmp.backToForm();
    expect(cmp.step()).toBe('form');
    // Form-Werte stehen noch — ein erneuter Submit darf ohne neues Ausfuellen funktionieren
    expect(cmp.form.valid).toBe(true);
  });

  // ─── Submit-Button disabled wenn Form invalid ──────────────────

  it('Submit-Button ist disabled solange Pflichtfelder fehlen', () => {
    const { fixture } = setup({ kind: 'sent' });
    const el = fixture.nativeElement as HTMLElement;
    const btn = el.querySelector('.form-actions-submit') as HTMLButtonElement;
    // Initial: alles leer -> disabled
    expect(btn.disabled).toBe(true);
  });

  it('Submit-Button wird enabled sobald Formular valide ist', () => {
    const { fixture } = setup({ kind: 'sent' });
    const cmp = fixture.componentInstance as unknown as KontaktCmp;
    fillValidForm(cmp);
    fixture.detectChanges();
    const btn = (fixture.nativeElement as HTMLElement).querySelector(
      '.form-actions-submit',
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  // ─── Submit-Flow: Invalid ───────────────────────────────────────

  it('invalides Formular -> kein API-Call, step bleibt form', () => {
    const { fixture, apiMock } = setup({ kind: 'sent' });
    const cmp = fixture.componentInstance as unknown as KontaktCmp;
    // Nichts ausgefuellt, alle Required fehlen
    cmp.submit();
    expect(apiMock.calls.length).toBe(0);
    expect(cmp.step()).toBe('form');
  });

  it('Datenschutz ungesetzt -> submit blockiert', () => {
    const { fixture, apiMock } = setup({ kind: 'sent' });
    const cmp = fixture.componentInstance as unknown as KontaktCmp;
    cmp.form.setValue({
      name: 'Max',
      email: 'max@example.com',
      phone: '',
      subject: 'kurs',
      message: 'Hallo.',
      datenschutz: false,
    });
    cmp.submit();
    expect(apiMock.calls.length).toBe(0);
  });

  // ─── Reset ──────────────────────────────────────────────────────

  it('resetForm: leert die Felder und setzt step zurueck', () => {
    const { fixture } = setup({ kind: 'sent' });
    const cmp = fixture.componentInstance as unknown as KontaktCmp;
    fillValidForm(cmp);
    cmp.submit();
    expect(cmp.step()).toBe('success');
    cmp.resetForm();
    expect(cmp.step()).toBe('form');
    expect(cmp.form.valid).toBe(false); // alle Required wieder leer
  });
});
