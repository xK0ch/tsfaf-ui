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
import type { VeranstaltungItem } from '../veranstaltungen';

@Component({
  selector: 'app-event-detail-panel',
  imports: [],
  templateUrl: './event-detail-panel.html',
  styleUrl: './event-detail-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'requestClose()',
  },
})
export class EventDetailPanel implements AfterViewInit, OnDestroy {
  private readonly document = inject(DOCUMENT);

  readonly event = input.required<VeranstaltungItem>();
  readonly closed = output<void>();

  protected readonly visible = signal(false);
  protected readonly copied = signal(false);
  protected readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');

  private readonly previousOverflow: string;
  private copyTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Baut den WhatsApp-Share-Link. Ruft `location.href` zur Aufrufzeit ab
   * damit immer die aktuelle URL geteilt wird (inkl. `?event=<slug>`,
   * was direkt auf das offene Detail-Panel verlinkt).
   */
  protected buildWhatsappUrl(): string {
    const win = this.document.defaultView;
    const url = win?.location.href ?? '';
    const text = `${this.event().title} bei der Tanzschule Family und Friends: ${url}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  constructor() {
    this.previousOverflow = this.document.body.style.overflow;
    this.document.body.style.overflow = 'hidden';
  }

  ngAfterViewInit(): void {
    requestAnimationFrame(() => {
      this.visible.set(true);
      this.closeButton()?.nativeElement.focus();
    });
  }

  ngOnDestroy(): void {
    this.document.body.style.overflow = this.previousOverflow;
    if (this.copyTimer !== null) {
      clearTimeout(this.copyTimer);
    }
  }

  protected requestClose(): void {
    this.visible.set(false);
    setTimeout(() => this.closed.emit(), 350);
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.requestClose();
    }
  }

  protected async copyLink(): Promise<void> {
    const win = this.document.defaultView;
    if (!win) {
      return;
    }
    // location.href enthaelt mit Hash-Routing den Pfad inkl.
    // `?event=<slug>`-QueryParam — das oeffnet das Panel beim
    // Aufruf direkt wieder.
    const url = win.location.href;
    try {
      await win.navigator.clipboard.writeText(url);
      this.copied.set(true);
      if (this.copyTimer !== null) {
        clearTimeout(this.copyTimer);
      }
      this.copyTimer = setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Clipboard API may be unavailable. Fail silently for now.
    }
  }

  protected downloadIcs(): void {
    const ev = this.event();
    // Floating local-time format (kein Z-Suffix) — Veranstaltungen sind
    // immer in lokaler Zeit der Tanzschule, nicht in UTC. ICS-Konsumenten
    // zeigen das dann in der Zeitzone des Geraets an, was hier korrekt
    // ist.
    const pad = (n: number): string => (n < 10 ? `0${n}` : String(n));
    const dt = (d: Date): string =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//tsfaf//veranstaltungen//DE',
      'BEGIN:VEVENT',
      `UID:${ev.id}@tanzschule-family-and-friends.de`,
      `DTSTAMP:${dt(new Date())}`,
      `DTSTART:${dt(ev.start)}`,
      `DTEND:${dt(ev.end)}`,
      `SUMMARY:${ev.title}`,
      `DESCRIPTION:${ev.excerpt}`,
      'LOCATION:Tanzschule Family und Friends, Georg-Fuhg-Straße 6, 24537 Neumünster',
      'END:VEVENT',
      'END:VCALENDAR',
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = this.document.createElement('a');
    a.href = url;
    a.download = `${ev.slug}.ics`;
    this.document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}
