import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DOCUMENT,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { VeranstaltungItem } from '../veranstaltungen';

@Component({
  selector: 'app-event-detail-panel',
  imports: [RouterLink],
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

  protected readonly whatsappUrl = computed(() => {
    const text = `${this.event().title} bei der Tanzschule Family und Friends`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  });

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
    const ev = this.event();
    const win = this.document.defaultView;
    if (!win) {
      return;
    }
    const url = `${win.location.origin}${win.location.pathname}?event=${ev.slug}`;
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
    const dt = (d: Date): string => d.toISOString().replace(/[-:]|\.\d+/g, '');
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
      'LOCATION:Tanzschule Family und Friends, Kieler Straße 54, 24534 Neumünster',
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
