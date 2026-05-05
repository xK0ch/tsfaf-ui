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
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { Course } from '../kurse';

type ModalStep = 'form' | 'success';

@Component({
  selector: 'app-anmelde-modal',
  imports: [ReactiveFormsModule, RouterLink],
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

  readonly course = input.required<Course>();
  readonly closed = output<void>();

  protected readonly step = signal<ModalStep>('form');
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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.step.set('success');
  }
}
