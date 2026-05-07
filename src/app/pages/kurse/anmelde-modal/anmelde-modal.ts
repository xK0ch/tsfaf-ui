import { DecimalPipe } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { CotasApiService } from '../../../core/services/cotas-api.service';
import {
  CotasDanceClass,
  RegistrationSubmitPayload,
} from '../../../core/models/cotas.models';

type ModalStep = 'form' | 'success' | 'error';

/**
 * Anmelde-Modal. Phase 1: bestehende Vorname/Nachname/Email/Telefon-Felder
 * plus Datenschutz. Sendet an POST /registrations.
 *
 * Hinweis: das Cotas-Backend erwartet noch weitere Pflichtfelder (Strasse,
 * Hausnummer, PLZ, Stadt, Geburtstag, Anrede, vertrag_id, ...). Solange die
 * fehlen, gibt der Server HTTP 422 mit err_<feld> Markern zurueck. Phase 2
 * erweitert das Formular auf die volle Pflichtfeld-Liste plus IBAN-Toggle
 * und Partner-Toggle. In Phase 1 zeigen wir den Server-Fehler dem User an
 * und behandeln den Erfolgsfall korrekt.
 */
@Component({
  selector: 'app-anmelde-modal',
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe],
  templateUrl: './anmelde-modal.html',
  styleUrl: './anmelde-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'requestClose()',
  },
})
export class AnmeldeModal implements AfterViewInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly document = inject(DOCUMENT);
  private readonly api = inject(CotasApiService);

  readonly course = input.required<CotasDanceClass>();
  readonly closed = output<void>();

  protected readonly step = signal<ModalStep>('form');
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly firstField = viewChild<ElementRef<HTMLInputElement>>('firstField');

  protected readonly form = this.fb.nonNullable.group({
    vorname:     ['', [Validators.required, Validators.minLength(1)]],
    nachname:    ['', [Validators.required, Validators.minLength(1)]],
    email:       ['', [Validators.required, Validators.email]],
    telefon:     [''],
    datenschutz: [false, [Validators.requiredTrue]],
  });

  private readonly previousOverflow: string;

  constructor() {
    this.previousOverflow = this.document.body.style.overflow;
    this.document.body.style.overflow = 'hidden';
  }

  ngAfterViewInit(): void {
    this.firstField()?.nativeElement.focus();
  }

  ngOnDestroy(): void {
    this.document.body.style.overflow = this.previousOverflow;
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.requestClose();
    }
  }

  protected requestClose(): void {
    this.closed.emit();
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const c = this.course();
    const v = this.form.getRawValue();

    // Phase 1: minimaler Payload. Pflichtfelder die wir aktuell nicht erfassen
    // werden mit Platzhaltern befuellt. Backend lehnt das ggf. ab (HTTP 422),
    // wir zeigen den Fehler dann an. Phase 2 ergaenzt die fehlenden Felder.
    const payload: RegistrationSubmitPayload = {
      id: c.id,
      kurskennung: c.kurskennung,
      vertrag_id: '',
      anrede: 1,
      vorname: v.vorname,
      nachname: v.nachname,
      strasse: '',
      hausnummer: '',
      plz: '',
      stadt: '',
      email: v.email,
      telefon: v.telefon,
      geburtstag: '',
      partner: 0,
      debit_charge: 0,
      checked: 1,
    };

    this.submitting.set(true);
    this.serverError.set(null);

    this.api.submitRegistration(payload).subscribe({
      next: (response) => {
        this.submitting.set(false);
        if (response.errors) {
          // Validierungsfehler vom Backend
          const fields = Object.keys(response)
            .filter(k => k.startsWith('err_'))
            .map(k => k.slice(4));
          this.serverError.set(
            fields.length
              ? `Server hat folgende Felder als Pflicht zurueckgewiesen: ${fields.join(', ')}. ` +
                `Wir muessen das Formular noch um diese Felder erweitern (Phase 2).`
              : 'Anmeldung konnte nicht verarbeitet werden.',
          );
          this.step.set('error');
        } else {
          this.step.set('success');
        }
      },
      error: (err) => {
        this.submitting.set(false);
        this.serverError.set(
          (err?.error?.error as string | undefined) ??
            err?.message ??
            'Netzwerkfehler bei der Anmeldung. Bitte spaeter erneut versuchen.',
        );
        this.step.set('error');
      },
    });
  }

  protected backToForm(): void {
    this.serverError.set(null);
    this.step.set('form');
  }

  // ----- Display-Helpers fuer das Template -----

  protected get courseDisplay() {
    return this.course();
  }

  protected startTime(): string {
    const c = this.course();
    return c.tmpl_start || (c.start ?? '').slice(0, 5);
  }

  protected duration(): number {
    const c = this.course();
    const parse = (s: string): number | null => {
      const [h, m] = (s ?? '').split(':').map(n => parseInt(n, 10));
      if (Number.isNaN(h) || Number.isNaN(m)) return null;
      return h * 60 + m;
    };
    const a = parse(c.start);
    const b = parse(c.ende);
    if (a == null || b == null) return 0;
    return Math.max(0, b - a);
  }

  protected priceNumber(): number {
    const n = parseFloat(this.course().honorar);
    return Number.isFinite(n) ? n : 0;
  }

  protected priceLabel(): string {
    const u = parseInt(this.course().einheiten, 10);
    return Number.isFinite(u) && u > 0 ? `${u} Termine` : '';
  }
}
