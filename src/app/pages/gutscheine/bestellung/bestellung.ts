import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';

import {
  CotasVoucher,
  VoucherOrderPayload,
} from '../../../core/models/cotas.models';
import { CotasApiService } from '../../../core/services/cotas-api.service';

type Step = 'form' | 'submitting' | 'success' | 'error';

interface State {
  loading: boolean;
  error: string | null;
  voucher: CotasVoucher | null;
}

const PRELOAD: State = { loading: true, error: null, voucher: null };

@Component({
  selector: 'app-gutschein-bestellung',
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe],
  templateUrl: './bestellung.html',
  styleUrl: './bestellung.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Bestellung {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(CotasApiService);
  private readonly fb = inject(FormBuilder);

  // ----- Daten-Lade-Pipeline -----

  protected readonly state = toSignal(
    this.route.params.pipe(
      switchMap(p =>
        this.api.getVoucher(p['id'] as string).pipe(
          switchMap(v => {
            if (!v) return of<State>({ loading: false, error: 'Gutschein-Vorlage nicht gefunden.', voucher: null });
            return of<State>({ loading: false, error: null, voucher: v });
          }),
          catchError(err =>
            of<State>({
              loading: false,
              error: err?.message ?? 'Fehler beim Laden der Vorlage.',
              voucher: null,
            }),
          ),
        ),
      ),
    ),
    { initialValue: PRELOAD },
  );

  protected readonly voucher = computed<CotasVoucher | null>(() => this.state().voucher);

  // ----- UI-State -----

  protected readonly step = signal<Step>('form');
  protected readonly serverError = signal<string | null>(null);
  protected readonly invalidServerFields = signal<readonly string[]>([]);
  protected readonly agbModalOpen = signal(false);

  // ----- Form -----

  protected readonly form = this.fb.nonNullable.group({
    // Gutschein-Details
    name: ['', Validators.required],
    betrag: ['', [Validators.required, betragPositive()]],
    bemerkung: ['', Validators.maxLength(160)],

    // Bestellart
    // 1 = Selbstausdruck (PDF), 0 = Zusendung per Post.
    // null = noch nicht gewaehlt -> Validators.required failt.
    selbstausdruck: this.fb.control<number | null>(null, Validators.required),

    // Buyer-Daten
    anrede: [0, [Validators.required, minNonZero()]],
    vorname: ['', Validators.required],
    nachname: ['', Validators.required],
    strasse: ['', Validators.required],
    hausnummer: ['', Validators.required],
    plz: ['', Validators.required],
    stadt: ['', Validators.required],
    // Vorwahl und Telefon sind beide optional. Cross-Validation:
    // wenn eines ausgefuellt ist, ist das andere auch Pflicht.
    vorwahl: ['', requireIfSiblingFilled('telefon')],
    telefon: ['', requireIfSiblingFilled('vorwahl')],
    email: ['', [Validators.required, Validators.email]],

    // SEPA-Lastschrift (immer Pflicht bei Gutscheinen)
    inhaber: ['', Validators.required],
    iban: ['', Validators.required],
    bic: ['', Validators.required],

    // AGB-Akzeptanz
    checked: [false, Validators.requiredTrue],
  });

  constructor() {
    // Cross-Validation Telefon/Vorwahl: wenn eines geaendert wird, muss das
    // andere neu validiert werden weil dessen Validator die Sibling-Value
    // liest.
    this.form.controls.vorwahl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.form.controls.telefon.updateValueAndValidity({
          onlySelf: true,
          emitEvent: false,
        });
      });
    this.form.controls.telefon.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.form.controls.vorwahl.updateValueAndValidity({
          onlySelf: true,
          emitEvent: false,
        });
      });
  }

  // ----- Aktionen -----

  protected goBack(): void {
    this.router.navigate(['/gutscheine']);
  }

  protected resetServerError(): void {
    this.serverError.set(null);
    this.invalidServerFields.set([]);
    this.step.set('form');
  }

  protected openAgb(event: Event): void {
    event.preventDefault();
    this.agbModalOpen.set(true);
  }

  protected closeAgb(): void {
    this.agbModalOpen.set(false);
  }

  protected onAgbBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeAgb();
    }
  }

  protected submit(): void {
    if (this.step() === 'submitting') return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      queueMicrotask(() => {
        const first = document.querySelector<HTMLElement>(
          '.field-error, [aria-invalid="true"]',
        );
        first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }

    const v = this.voucher();
    if (!v) return;
    const f = this.form.getRawValue();

    const payload: VoucherOrderPayload = {
      voucher_id: v.id,
      selbstausdruck: f.selbstausdruck === 1 ? 1 : 0,
      name: f.name.trim(),
      betrag: f.betrag.trim().replace(/\s+/g, ''),
      bemerkung: f.bemerkung?.trim() || '',
      checked: f.checked ? 1 : 0,

      anrede: Number(f.anrede),
      vorname: f.vorname.trim(),
      nachname: f.nachname.trim(),
      strasse: f.strasse.trim(),
      hausnummer: f.hausnummer.trim(),
      plz: f.plz.trim(),
      stadt: f.stadt.trim(),
      email: f.email.trim(),
      // Wenn beide leer sind, Sentinel '-' damit das Server-Mandatory
      // durchgeht. Form-Cross-Validator verhindert dass nur eines gefuellt ist.
      vorwahl: f.vorwahl.trim() || '-',
      telefon: f.telefon.trim() || '-',

      // SEPA-Lastschrift immer Pflicht
      lastschrift: 1,
      inhaber: f.inhaber.trim(),
      iban: f.iban.replace(/\s+/g, ''),
      bic: f.bic.trim(),
    };

    this.step.set('submitting');
    this.serverError.set(null);
    this.invalidServerFields.set([]);

    this.api.orderVoucher(payload).subscribe({
      next: response => {
        if (response.errors) {
          this.handleServerErrors(response);
          this.step.set('error');
        } else {
          this.step.set('success');
        }
      },
      error: err => {
        const body = err?.error;
        if (body && typeof body === 'object' && !Array.isArray(body)) {
          const fields = Object.keys(body)
            .filter(k => k.startsWith('err_') && k !== 'err_mail')
            .map(k => k.slice(4));
          if (fields.length > 0) {
            this.invalidServerFields.set(fields);
            this.serverError.set(`Bitte prüfe die markierten Felder: ${fields.join(', ')}.`);
            this.markServerErrors(fields);
            this.step.set('error');
            return;
          }
        }
        this.serverError.set(err?.message ?? 'Netzwerkfehler bei der Bestellung.');
        this.step.set('error');
      },
    });
  }

  // ----- Display Helpers -----

  protected priceFor(): number {
    const raw = this.form.controls.betrag.value;
    const n = parseFloat((raw ?? '').replace(',', '.').replace(/\s/g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  protected isFieldServerInvalid(name: string): boolean {
    return this.invalidServerFields().includes(name);
  }

  // ----- Internal helpers -----

  private handleServerErrors(response: Record<string, unknown>): void {
    const fields = Object.keys(response)
      .filter(k => k.startsWith('err_') && k !== 'err_mail')
      .map(k => k.slice(4));
    this.invalidServerFields.set(fields);
    this.serverError.set(
      response['err_mail']
        ? 'E-Mail konnte nicht versendet werden. Bitte später erneut versuchen.'
        : `Bitte prüfe die markierten Felder: ${fields.join(', ')}.`,
    );
    this.markServerErrors(fields);
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
 * Cross-Field Validator: wenn das benannte Schwester-Feld einen Wert hat,
 * ist DIESES Feld auch Pflicht. Wenn das Schwester-Feld leer ist, ist das
 * Feld optional. Ergebnis: { requiredWithSibling: true } oder null.
 */
function requireIfSiblingFilled(siblingName: string): ValidatorFn {
  return (ctrl: AbstractControl) => {
    const parent = ctrl.parent;
    if (!parent) return null;
    const sibling = parent.get(siblingName);
    if (!sibling) return null;
    const myValue = (ctrl.value ?? '').toString().trim();
    const sibValue = (sibling.value ?? '').toString().trim();
    if (sibValue !== '' && myValue === '') {
      return { requiredWithSibling: true };
    }
    return null;
  };
}

/**
 * Betrag muss eine positive Zahl (Cents/Euro) sein. Akzeptiert Komma
 * oder Punkt, optional Leerzeichen.
 */
function betragPositive(): ValidatorFn {
  return (ctrl: AbstractControl) => {
    const v = (ctrl.value ?? '').toString().trim();
    if (v === '') return null; // required wird separat geprueft
    const n = parseFloat(v.replace(',', '.').replace(/\s/g, ''));
    if (!Number.isFinite(n) || n <= 0) return { betragInvalid: true };
    return null;
  };
}
