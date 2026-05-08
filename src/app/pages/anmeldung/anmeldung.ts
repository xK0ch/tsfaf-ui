import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';

import {
  CotasContract,
  CotasDanceClass,
  RegistrationPreviewResponse,
  RegistrationSubmitPayload,
} from '../../core/models/cotas.models';
import { CotasApiService } from '../../core/services/cotas-api.service';

type Step = 'form' | 'submitting' | 'success' | 'error';

interface PreviewState {
  loading: boolean;
  error: string | null;
  data: RegistrationPreviewResponse | null;
}

const PHASE_PRELOAD: PreviewState = { loading: true, error: null, data: null };

@Component({
  selector: 'app-anmeldung',
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe],
  templateUrl: './anmeldung.html',
  styleUrl: './anmeldung.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Anmeldung {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(CotasApiService);
  private readonly fb = inject(FormBuilder);

  // ----- Daten-Lade-Pipeline -----

  protected readonly courseId = toSignal(
    this.route.params.pipe(switchMap(p => of(p['id'] as string))),
    { initialValue: '' },
  );

  protected readonly state = toSignal(
    this.route.params.pipe(
      switchMap(p =>
        this.api.previewRegistration(p['id'] as string).pipe(
          switchMap(res => {
            if (!res?.dance_class) {
              return of<PreviewState>({
                loading: false,
                error: 'Kurs nicht gefunden.',
                data: null,
              });
            }
            return of<PreviewState>({ loading: false, error: null, data: res });
          }),
          catchError(err =>
            of<PreviewState>({
              loading: false,
              error: err?.message ?? 'Fehler beim Laden des Kurses.',
              data: null,
            }),
          ),
        ),
      ),
    ),
    { initialValue: PHASE_PRELOAD },
  );

  protected readonly course = computed<CotasDanceClass | null>(
    () => this.state().data?.dance_class ?? null,
  );

  protected readonly contracts = computed<readonly CotasContract[]>(
    () => (this.state().data?.contracts ?? []) as CotasContract[],
  );

  // ----- UI-State -----

  protected readonly step = signal<Step>('form');
  protected readonly serverError = signal<string | null>(null);
  /** Liste der vom Backend zurueckgewiesenen Felder fuer Hinweis im UI. */
  protected readonly invalidServerFields = signal<readonly string[]>([]);

  // ----- Form -----

  protected readonly form = this.fb.nonNullable.group({
    vertrag_id: [0, [Validators.required, minNonZero()]],
    partner: [0, [Validators.required, minNonZero()]],

    anrede: [0, [Validators.required, minNonZero()]],
    vorname: ['', Validators.required],
    nachname: ['', Validators.required],
    geburtstag: ['', Validators.required],

    strasse: ['', Validators.required],
    hausnummer: ['', Validators.required],
    plz: ['', Validators.required],
    stadt: ['', Validators.required],

    telefon: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],

    bemerkung: [''],

    debit_charge: [false],
    inhaber: [''],
    iban: [''],
    bic: [''],

    p_anrede: [0],
    p_vorname: [''],
    p_nachname: [''],
    p_geburtstag: [''],
    p_strasse: [''],
    p_hausnummer: [''],
    p_plz: [''],
    p_stadt: [''],
    p_telefon: [''],
    p_email: [''],

    same_bank: [true],
    p_inhaber: [''],
    p_iban: [''],
    p_bic: [''],

    checked: [false, [Validators.requiredTrue]],
  });

  // Toggle-Werte als Signals, damit das Template ohne async-Pipe arbeiten kann
  protected readonly partnerValue = toSignal(this.form.controls.partner.valueChanges, {
    initialValue: 0,
  });
  protected readonly debitValue = toSignal(this.form.controls.debit_charge.valueChanges, {
    initialValue: false,
  });
  protected readonly sameBankValue = toSignal(this.form.controls.same_bank.valueChanges, {
    initialValue: true,
  });

  protected readonly partnerOn = computed(() => Number(this.partnerValue()) === 1);
  protected readonly debitOn = computed(() => !!this.debitValue());
  protected readonly partnerBankSeparate = computed(
    () => this.partnerOn() && this.debitOn() && !this.sameBankValue(),
  );

  constructor() {
    // Conditional validators: bei Aenderung von partner/debit_charge die
    // entsprechenden Validators (de)aktivieren.
    effect(() => {
      const partner = this.partnerOn();
      const debit = this.debitOn();
      const sameBank = !!this.sameBankValue();

      this.applyValidators(['inhaber', 'iban', 'bic'], debit);
      this.applyValidators(
        [
          'p_anrede',
          'p_vorname',
          'p_nachname',
          'p_geburtstag',
          'p_strasse',
          'p_hausnummer',
          'p_plz',
          'p_stadt',
          'p_telefon',
          'p_email',
        ],
        partner,
        { numericMin1: ['p_anrede'] },
      );
      this.applyValidators(
        ['p_inhaber', 'p_iban', 'p_bic'],
        partner && debit && !sameBank,
      );
    });
  }

  // ----- Aktionen -----

  protected goBack(): void {
    this.router.navigate(['/kurse']);
  }

  protected resetServerError(): void {
    this.serverError.set(null);
    this.invalidServerFields.set([]);
    this.step.set('form');
  }

  protected submit(): void {
    if (this.step() === 'submitting') return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // erstes Fehler-Element fokussieren
      queueMicrotask(() => {
        const first = document.querySelector<HTMLElement>(
          '.field-error, [aria-invalid="true"]',
        );
        first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }

    const c = this.course();
    if (!c) return;
    const v = this.form.getRawValue();

    const partnerCode = (Number(v.partner) === 1 ? 1 : Number(v.partner) === 2 ? 2 : 0) as 0 | 1 | 2;
    const debitOn = !!v.debit_charge;
    const sameBank = !!v.same_bank;
    const partnerOn = partnerCode === 1;

    const payload: RegistrationSubmitPayload = {
      id: c.id,
      kurskennung: c.kurskennung,
      vertrag_id: String(v.vertrag_id),
      anrede: Number(v.anrede),
      vorname: v.vorname.trim(),
      nachname: v.nachname.trim(),
      geburtstag: toGermanDate(v.geburtstag),
      strasse: v.strasse.trim(),
      hausnummer: v.hausnummer.trim(),
      plz: v.plz.trim(),
      stadt: v.stadt.trim(),
      telefon: v.telefon.trim(),
      email: v.email.trim(),
      bemerkung: v.bemerkung?.trim() || '',
      partner: partnerCode,
      debit_charge: debitOn ? 1 : 0,
      checked: v.checked ? 1 : 0,
    };

    if (debitOn) {
      payload.inhaber = v.inhaber.trim();
      payload.iban = v.iban.replace(/\s+/g, '');
      payload.bic = v.bic.trim();
    }

    if (partnerOn) {
      payload.p_anrede = Number(v.p_anrede);
      payload.p_vorname = v.p_vorname.trim();
      payload.p_nachname = v.p_nachname.trim();
      payload.p_geburtstag = toGermanDate(v.p_geburtstag);
      payload.p_strasse = v.p_strasse.trim();
      payload.p_hausnummer = v.p_hausnummer.trim();
      payload.p_plz = v.p_plz.trim();
      payload.p_stadt = v.p_stadt.trim();
      payload.p_telefon = v.p_telefon.trim();
      payload.p_email = v.p_email.trim();

      if (debitOn) {
        payload.p_lastschrift = 1;
        payload.p_inhaber = sameBank ? payload.inhaber : v.p_inhaber.trim();
        payload.p_iban = sameBank ? payload.iban : v.p_iban.replace(/\s+/g, '');
        payload.p_bic = sameBank ? payload.bic : v.p_bic.trim();
      }
    }

    this.step.set('submitting');
    this.serverError.set(null);
    this.invalidServerFields.set([]);

    this.api.submitRegistration(payload).subscribe({
      next: response => {
        if (response.errors) {
          const fields = Object.keys(response)
            .filter(k => k.startsWith('err_') && k !== 'err_mail')
            .map(k => k.slice(4));
          this.invalidServerFields.set(fields);
          this.serverError.set(
            response['err_mail']
              ? 'E-Mail konnte nicht versendet werden. Bitte spaeter erneut versuchen.'
              : 'Bitte pruefe die markierten Felder.',
          );
          this.markServerErrors(fields);
          this.step.set('error');
        } else {
          this.step.set('success');
        }
      },
      error: err => {
        this.serverError.set(
          (err?.error?.error as string | undefined) ??
            err?.message ??
            'Netzwerkfehler bei der Anmeldung.',
        );
        this.step.set('error');
      },
    });
  }

  // ----- Display Helpers -----

  protected priceFor(c: CotasContract): number {
    const n = parseFloat(c.zahlbetrag);
    return Number.isFinite(n) ? n : 0;
  }

  protected description(): string {
    const raw = this.course()?.info_text ?? '';
    const text = raw
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text;
  }

  protected isFieldServerInvalid(name: string): boolean {
    return this.invalidServerFields().includes(name);
  }

  // ----- Internal helpers -----

  private applyValidators(
    names: readonly string[],
    enabled: boolean,
    opts: { numericMin1?: readonly string[] } = {},
  ): void {
    const controls = this.form.controls as Record<string, AbstractControl | undefined>;
    for (const name of names) {
      const ctrl = controls[name];
      if (!ctrl) continue;
      if (enabled) {
        const validators: ValidatorFn[] = [Validators.required];
        if (opts.numericMin1?.includes(name)) {
          validators.push(minNonZero());
        }
        if (name === 'p_email') {
          validators.push(Validators.email);
        }
        ctrl.setValidators(validators);
      } else {
        ctrl.clearValidators();
      }
      ctrl.updateValueAndValidity({ emitEvent: false });
    }
  }

  private markServerErrors(fields: readonly string[]): void {
    for (const f of fields) {
      const ctrl = (this.form.controls as Record<string, AbstractControl | undefined>)[f];
      if (ctrl) {
        ctrl.setErrors({ ...(ctrl.errors ?? {}), server: true });
        ctrl.markAsTouched();
      }
    }
  }
}

// ----- Modul-globale Helper -----

function minNonZero(): ValidatorFn {
  return (ctrl: AbstractControl) => {
    const v = ctrl.value;
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n) || n < 1) return { min: true };
    return null;
  };
}

/**
 * "2000-01-15" (HTML date input) -> "15.01.2000" (Cotas-Format).
 * Leerwerte werden durchgereicht.
 */
function toGermanDate(iso: string): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}
