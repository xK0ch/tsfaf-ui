import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  viewChild,
} from '@angular/core';

import type { TeamMember } from '../ueber-uns-data';

/**
 * Deterministischer Hash aus der Mitglieds-ID — damit der
 * Initials-Avatar pro Person eine konsistente Farbe bekommt, auch wenn
 * kein Foto gepflegt ist.
 */
function hashSeed(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (Math.imul(31, h) + value.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

@Component({
  selector: 'app-team-card',
  templateUrl: './team-card.html',
  styleUrl: './team-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamCard {
  readonly member = input.required<TeamMember>();

  /**
   * Referenz aufs native <dialog>-Element. <dialog> handhabt ESC und
   * Focus-Trap nativ, wir muessen nur showModal()/close() aufrufen.
   */
  private readonly lightboxRef = viewChild<ElementRef<HTMLDialogElement>>('lightbox');

  /**
   * Erst- und Nachname-Initial. Bei einem einzigen Wort nur ein Buchstabe.
   * "Tabea Höftmann" -> "TH", "Max" -> "M".
   */
  protected readonly initials = computed(() => {
    const parts = this.member().name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return '?';
    }
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (
      parts[0].charAt(0).toUpperCase() +
      parts[parts.length - 1].charAt(0).toUpperCase()
    );
  });

  protected readonly avatarBackground = computed(() =>
    hashSeed(this.member().id) % 2 === 0
      ? 'var(--color-primary)'
      : 'var(--color-secondary)',
  );

  protected openLightbox(): void {
    this.lightboxRef()?.nativeElement.showModal();
  }

  protected closeLightbox(): void {
    this.lightboxRef()?.nativeElement.close();
  }

  /**
   * Klick auf den Backdrop (also auf das Dialog-Element selbst, nicht
   * auf dessen Inhalt) schliesst die Lightbox. Wir pruefen `event.target`
   * gegen `event.currentTarget` — wenn gleich, war's der Backdrop.
   */
  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeLightbox();
    }
  }
}
