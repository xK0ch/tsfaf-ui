import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';

import { KontaktApiService } from '../../core/services/kontakt-api.service';

/**
 * UI-Zustaende des Formulars:
 *   form    — Eingabe sichtbar
 *   loading — Spinner waehrend der HTTP-Request laeuft
 *   success — Erfolgsmeldung, Formular durch ResetForm zurueck zu form
 *   error   — Mail konnte nicht verschickt werden (Netzwerk/Server),
 *             User kann erneut absenden
 */
type FormStep = 'form' | 'loading' | 'success' | 'error';

interface OpeningRow {
  readonly day: string;
  readonly hours: string;
  readonly closed: boolean;
}

interface SubjectOption {
  readonly value: string;
  readonly label: string;
}

@Component({
  selector: 'app-kontakt',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './kontakt.html',
  styleUrl: './kontakt.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Kontakt {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(KontaktApiService);

  protected readonly step = signal<FormStep>('form');
  protected readonly mapConsented = signal(false);
  protected readonly honeypot = viewChild<ElementRef<HTMLInputElement>>('honeypot');

  protected readonly subjectOptions: readonly SubjectOption[] = [
    { value: 'kurs',          label: 'Frage zu einem Kurs' },
    { value: 'anmeldung',     label: 'Kursanmeldung' },
    { value: 'gutschein',     label: 'Gutschein' },
    { value: 'veranstaltung', label: 'Veranstaltungsanfrage' },
    { value: 'sonstiges',     label: 'Sonstiges' },
  ];

  protected readonly openingHours: readonly OpeningRow[] = [
    { day: 'Mo bis Fr', hours: '14:30 bis 22:30 Uhr', closed: false },
    { day: 'Samstag',   hours: '17:00 bis 23:00 Uhr', closed: false },
    { day: 'Sonntag',   hours: '14:30 bis 21:30 Uhr', closed: false },
  ];

  protected readonly form = this.fb.nonNullable.group({
    name:        ['', [Validators.required, Validators.minLength(2)]],
    phone:       [''],
    email:       ['', [Validators.required, Validators.email]],
    subject:     ['', [Validators.required]],
    message:     ['', [Validators.required, Validators.minLength(2)]],
    datenschutz: [false, [Validators.requiredTrue]],
  });

  protected loadMap(): void {
    this.mapConsented.set(true);
  }

  protected submit(): void {
    if (this.honeypot()?.nativeElement.value) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.step.set('loading');
    const v = this.form.getRawValue();
    this.api
      .send({
        name: v.name,
        email: v.email,
        phone: v.phone,
        subject: v.subject,
        message: v.message,
        datenschutz: v.datenschutz,
        honeypot: this.honeypot()?.nativeElement.value ?? '',
      })
      .subscribe(result => {
        if (result.kind === 'sent') {
          this.step.set('success');
        } else {
          this.step.set('error');
        }
      });
  }

  protected resetForm(): void {
    this.form.reset({
      name: '',
      phone: '',
      email: '',
      subject: '',
      message: '',
      datenschutz: false,
    });
    this.step.set('form');
  }

  /** Aus dem Error-State zurueck zur Eingabe. Form-Werte bleiben erhalten. */
  protected backToForm(): void {
    this.step.set('form');
  }
}
