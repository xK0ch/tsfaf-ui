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

type FormStep = 'form' | 'loading' | 'success';

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
    { day: 'Mo bis Do', hours: '15:00 bis 21:30 Uhr',                       closed: false },
    { day: 'Freitag',   hours: '10:00 bis 12:00 und 15:00 bis 21:00 Uhr',   closed: false },
    { day: 'Samstag',   hours: 'nach Veranstaltungsplan',                   closed: false },
    { day: 'Sonntag',   hours: 'geschlossen',                               closed: true  },
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
    setTimeout(() => this.step.set('success'), 1400);
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
}
