import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { inject } from '@angular/core';

type AmountOption = 25 | 50 | 100 | 'custom';

interface InfoCard {
  readonly icon: string;
  readonly title: string;
  readonly text: string;
}

interface FaqItem {
  readonly q: string;
  readonly a: string;
}

const PRESET_AMOUNTS: readonly AmountOption[] = [25, 50, 100, 'custom'];

const INFO_CARDS: readonly InfoCard[] = [
  {
    icon: '🎁',
    title: 'Für alle Anlässe',
    text: 'Geburtstag, Jubiläum, Weihnachten: ein Tanzgutschein ist immer eine gute Idee.',
  },
  {
    icon: '📅',
    title: '3 Jahre gültig',
    text: 'Kein Stress mit dem Einlösen, drei Jahre ab Kaufdatum.',
  },
  {
    icon: '🎓',
    title: 'Bildungsgutschein',
    text: 'Auch Bildungsgutscheine der Agentur für Arbeit werden akzeptiert.',
  },
  {
    icon: '📬',
    title: 'Versand & Abholung',
    text: 'Abholung an der Tanzschule oder Versand in Neumünster und Umgebung, kostenlos.',
  },
];

const FAQ_ITEMS: readonly FaqItem[] = [
  {
    q: 'Wie lange ist der Gutschein gültig?',
    a: 'Tanzgutscheine sind 3 Jahre ab Kaufdatum gültig.',
  },
  {
    q: 'Wofür kann ich den Gutschein einlösen?',
    a: 'Für alle Kurse, Veranstaltungen und Eintritte in der Tanzschule Family & Friends.',
  },
  {
    q: 'Kann ich einen Bildungsgutschein einlösen?',
    a: 'Ja, wir akzeptieren auch Bildungsgutscheine der Agentur für Arbeit. Bitte ruf uns vorher kurz an.',
  },
  {
    q: 'Wie erhalte ich den Gutschein?',
    a: 'Du kannst den Gutschein direkt an der Tanzschule abholen oder per Post zusenden lassen (kostenfrei in Neumünster und Umgebung).',
  },
];

@Component({
  selector: 'app-gutscheine',
  imports: [ReactiveFormsModule],
  templateUrl: './gutscheine.html',
  styleUrl: './gutscheine.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gutscheine {
  private readonly fb = inject(FormBuilder);

  protected readonly amounts = PRESET_AMOUNTS;
  protected readonly infoCards = INFO_CARDS;
  protected readonly faqItems = FAQ_ITEMS;

  protected readonly selected = signal<AmountOption>(50);
  protected readonly customForm = this.fb.nonNullable.group({
    custom: [50, [Validators.required, Validators.min(10), Validators.max(500)]],
  });
  protected readonly customAmount = signal<number | null>(null);

  protected readonly openFaq = signal<number | null>(null);

  protected readonly isCustomSelected = computed(() => this.selected() === 'custom');

  protected readonly displayAmount = computed<number | null>(() => {
    const sel = this.selected();
    if (sel === 'custom') {
      return this.customAmount();
    }
    return sel;
  });

  protected readonly buyLabel = computed(() => {
    const a = this.displayAmount();
    return a === null ? 'Gutschein kaufen' : `Gutschein kaufen, ${a} €`;
  });

  protected selectAmount(amount: AmountOption): void {
    this.selected.set(amount);
    if (amount !== 'custom') {
      this.customAmount.set(null);
    } else {
      const v = this.customForm.controls.custom.value;
      if (Number.isFinite(v) && v >= 10 && v <= 500) {
        this.customAmount.set(v);
      }
    }
  }

  protected onCardKey(event: KeyboardEvent, amount: AmountOption): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.selectAmount(amount);
    }
  }

  protected onCustomInput(value: string): void {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
      this.customAmount.set(null);
      return;
    }
    this.customAmount.set(parsed);
  }

  protected toggleFaq(idx: number): void {
    this.openFaq.update(v => (v === idx ? null : idx));
  }
}
