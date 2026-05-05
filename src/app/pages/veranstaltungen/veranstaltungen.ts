import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { EventDetailPanel } from './event-detail-panel/event-detail-panel';

export type EventType = 'JustDance' | 'Workshop' | 'Tanzparty' | 'Ball' | 'Sonstige';

export interface VeranstaltungItem {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly type: EventType;
  readonly typeLabel: string;
  readonly tagClass: string;
  readonly start: Date;
  readonly end: Date;
  readonly day: number;
  readonly monthShort: string;
  readonly dateLabel: string;
  readonly timeLabel: string;
  readonly endTimeLabel: string;
  readonly monthKey: string;
  readonly past: boolean;
  readonly price: number;
  readonly priceCard: number | 'frei';
  readonly requiresRegistration: boolean;
  readonly excerpt: string;
  readonly description: readonly string[];
}

interface MonthGroup {
  readonly key: string;
  readonly events: readonly VeranstaltungItem[];
}

interface RawEvent {
  id: string;
  slug: string;
  title: string;
  type: EventType;
  start: string;
  end: string;
  price: number;
  priceCard: number | 'frei';
  requiresRegistration: boolean;
  excerpt: string;
  description: readonly string[];
}

const NOW = new Date('2025-05-02T12:00:00');
const ALL_FILTER = 'Alle';

const FILTERS: readonly string[] = [
  ALL_FILTER,
  'Just Dance',
  'Workshop',
  'Tanzparty',
  'Ball',
  'Sonstige',
];

const TYPE_LABELS: Record<EventType, string> = {
  JustDance: 'Just Dance',
  Workshop:  'Workshop',
  Tanzparty: 'Tanzparty',
  Ball:      'Ball',
  Sonstige:  'Sonstige',
};

const TYPE_TAG_CLASS: Record<EventType, string> = {
  JustDance: 'tag-secondary',
  Workshop:  'tag-primary',
  Tanzparty: 'tag-secondary',
  Ball:      'tag-primary',
  Sonstige:  'tag',
};

const RAW_EVENTS: readonly RawEvent[] = [
  {
    id: 'ev-001', slug: 'just-dance-2025-05-10',
    title: 'Just Dance', type: 'JustDance',
    start: '2025-05-10T17:00:00', end: '2025-05-10T19:00:00',
    price: 5, priceCard: 'frei', requiresRegistration: false,
    excerpt: 'Für alle aktiven und ehemaligen Tanzschüler.',
    description: [
      'Für alle aktiven und ehemaligen Tanzschüler, die ihre gelernten Schritte noch mal vertiefen möchten. Einfach vorbeikommen, Schuhe anziehen und lostanzen.',
      'Kein Programm, keine Kursstruktur, einfach Musik und Tanz in entspannter Atmosphäre.',
    ],
  },
  {
    id: 'ev-002', slug: 'discofox-haeppchen-2025-05-16',
    title: 'Discofox-Häppchen inkl. Tanzparty', type: 'Workshop',
    start: '2025-05-16T19:00:00', end: '2025-05-16T22:00:00',
    price: 15, priceCard: 10, requiresRegistration: true,
    excerpt: 'Discofox-Workshop mit anschließender Tanzparty.',
    description: [
      'Erweitere dein Discofox-Repertoire in einem kompakten Workshop und lass den Abend bei einer entspannten Tanzparty ausklingen.',
      'Für Paare und Einzelpersonen geeignet. Vorkenntnisse im Discofox erwünscht.',
    ],
  },
  {
    id: 'ev-003', slug: 'tanz-in-den-mai-2025',
    title: 'Tanz in den Mai', type: 'Tanzparty',
    start: '2025-05-30T21:00:00', end: '2025-05-31T01:00:00',
    price: 10, priceCard: 5, requiresRegistration: true,
    excerpt: 'Vier Stunden Musik und gute Laune.',
    description: [
      'Wir tanzen in den Mai: vier Stunden Musik, Spaß und gute Laune. Mit DJ und Livemusik.',
      'Für alle Tanzstile geeignet. Die Bar ist geöffnet.',
    ],
  },
  {
    id: 'ev-004', slug: 'abschlussball-2025-06',
    title: 'Abschlussball', type: 'Ball',
    start: '2025-06-06T20:00:00', end: '2025-06-07T01:00:00',
    price: 20, priceCard: 15, requiresRegistration: true,
    excerpt: 'Krönender Abschluss eures Kurses. Abendgarderobe.',
    description: [
      'Der krönende Abschluss eures Kurses. Zeigt, was ihr gelernt habt: auf der großen Bühne, vor Familie und Freunden. Abendgarderobe erwünscht.',
      'Karten im Vorverkauf an der Schule oder telefonisch: 04321 – 1 49 00.',
    ],
  },
  {
    id: 'ev-005', slug: 'just-dance-2025-06-14',
    title: 'Just Dance', type: 'JustDance',
    start: '2025-06-14T17:00:00', end: '2025-06-14T19:00:00',
    price: 5, priceCard: 'frei', requiresRegistration: false,
    excerpt: 'Für alle aktiven und ehemaligen Tanzschüler.',
    description: [
      'Für alle aktiven und ehemaligen Tanzschüler, die ihre gelernten Schritte noch mal vertiefen möchten.',
    ],
  },
  {
    id: 'ev-006', slug: 'zumba-party-2025-06-21',
    title: 'Zumba-Party', type: 'Workshop',
    start: '2025-06-21T18:00:00', end: '2025-06-21T20:00:00',
    price: 8, priceCard: 5, requiresRegistration: false,
    excerpt: 'Eine Stunde pure Zumba-Energy mit DJ.',
    description: [
      'Eine Stunde pure Zumba-Energy: mit DJ-Beats und dem ganzen Team. Für alle Level geeignet, einfach mitmachen.',
    ],
  },
  {
    id: 'ev-007', slug: 'just-dance-2025-04-12',
    title: 'Just Dance', type: 'JustDance',
    start: '2025-04-12T17:00:00', end: '2025-04-12T19:00:00',
    price: 5, priceCard: 'frei', requiresRegistration: false,
    excerpt: 'Für alle aktiven und ehemaligen Tanzschüler.',
    description: ['Für alle aktiven und ehemaligen Tanzschüler.'],
  },
  {
    id: 'ev-008', slug: 'discofox-haeppchen-2025-04-18',
    title: 'Discofox-Häppchen inkl. Tanzparty', type: 'Workshop',
    start: '2025-04-18T19:00:00', end: '2025-04-18T22:00:00',
    price: 15, priceCard: 10, requiresRegistration: true,
    excerpt: 'Discofox-Workshop mit anschließender Tanzparty.',
    description: ['Discofox-Workshop mit anschließender Tanzparty.'],
  },
];

function buildEvent(raw: RawEvent): VeranstaltungItem {
  const start = new Date(raw.start);
  const end = new Date(raw.end);
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    type: raw.type,
    typeLabel: TYPE_LABELS[raw.type],
    tagClass: TYPE_TAG_CLASS[raw.type],
    start,
    end,
    day: start.getDate(),
    monthShort: start.toLocaleDateString('de-DE', { month: 'short' }).replace('.', ''),
    dateLabel: start.toLocaleDateString('de-DE', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }),
    timeLabel: start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr',
    endTimeLabel: end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr',
    monthKey: start.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
    past: start < NOW,
    price: raw.price,
    priceCard: raw.priceCard,
    requiresRegistration: raw.requiresRegistration,
    excerpt: raw.excerpt,
    description: raw.description,
  };
}

const ALL_EVENTS: readonly VeranstaltungItem[] = RAW_EVENTS.map(buildEvent);

@Component({
  selector: 'app-veranstaltungen',
  imports: [EventDetailPanel],
  templateUrl: './veranstaltungen.html',
  styleUrl: './veranstaltungen.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Veranstaltungen {
  protected readonly filters = FILTERS;
  protected readonly allFilter = ALL_FILTER;

  protected readonly activeFilter = signal<string>(ALL_FILTER);
  protected readonly showPast = signal(false);
  protected readonly selectedEvent = signal<VeranstaltungItem | null>(null);

  protected readonly filtered = computed<readonly VeranstaltungItem[]>(() => {
    const filter = this.activeFilter();
    const includePast = this.showPast();
    return ALL_EVENTS
      .filter(ev => {
        const matchType = filter === ALL_FILTER || ev.typeLabel === filter;
        const matchTime = includePast || !ev.past;
        return matchType && matchTime;
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  });

  protected readonly grouped = computed<readonly MonthGroup[]>(() => {
    const map = new Map<string, VeranstaltungItem[]>();
    for (const ev of this.filtered()) {
      const list = map.get(ev.monthKey) ?? [];
      list.push(ev);
      map.set(ev.monthKey, list);
    }
    return Array.from(map.entries()).map(([key, events]) => ({ key, events }));
  });

  protected selectFilter(filter: string): void {
    this.activeFilter.set(filter);
  }

  protected togglePast(): void {
    this.showPast.update(v => !v);
  }

  protected showAll(): void {
    this.activeFilter.set(ALL_FILTER);
    this.showPast.set(true);
  }

  protected openDetail(event: VeranstaltungItem): void {
    this.selectedEvent.set(event);
  }

  protected closeDetail(): void {
    this.selectedEvent.set(null);
  }

  protected onCardKeydown(event: KeyboardEvent, item: VeranstaltungItem): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openDetail(item);
    }
  }
}
