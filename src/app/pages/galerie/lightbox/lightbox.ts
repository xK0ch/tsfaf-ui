import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DOCUMENT,
  effect,
  inject,
  input,
  OnDestroy,
  output,
  signal,
} from '@angular/core';

import { type Photo } from '../galerie-data';

@Component({
  selector: 'app-lightbox',
  templateUrl: './lightbox.html',
  styleUrl: './lightbox.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(keydown)': 'onKeyDown($event)',
    'tabindex': '-1',
  },
})
export class Lightbox implements OnDestroy {
  private readonly document = inject(DOCUMENT);

  readonly photos = input.required<readonly Photo[]>();
  readonly startIdx = input.required<number>();
  readonly closed = output<void>();

  protected readonly idx = signal(0);

  protected readonly current = computed(() => this.photos()[this.idx()]);
  protected readonly total = computed(() => this.photos().length);
  protected readonly canPrev = computed(() => this.idx() > 0);
  protected readonly canNext = computed(() => this.idx() < this.total() - 1);

  private touchStartX: number | null = null;
  private prevOverflow = '';

  constructor() {
    effect(() => {
      this.idx.set(this.startIdx());
    });

    const body = this.document.body;
    this.prevOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    this.document.body.style.overflow = this.prevOverflow;
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.prev();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.next();
    }
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  protected onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.touches[0]?.clientX ?? null;
  }

  protected onTouchEnd(event: TouchEvent): void {
    if (this.touchStartX === null) {
      return;
    }
    const endX = event.changedTouches[0]?.clientX ?? this.touchStartX;
    const dx = endX - this.touchStartX;
    if (dx > 50) {
      this.prev();
    } else if (dx < -50) {
      this.next();
    }
    this.touchStartX = null;
  }

  protected prev(): void {
    if (this.canPrev()) {
      this.idx.update(i => i - 1);
    }
  }

  protected next(): void {
    if (this.canNext()) {
      this.idx.update(i => i + 1);
    }
  }

  protected close(): void {
    this.closed.emit();
  }
}
