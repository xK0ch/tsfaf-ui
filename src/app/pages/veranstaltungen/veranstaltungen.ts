import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';

import { EventDetailPanel } from './event-detail-panel/event-detail-panel';
import {
  VeranstaltungenStore,
  type VeranstaltungItem,
} from './veranstaltungen-data';

// Re-export damit das EventDetailPanel (das von '../veranstaltungen' importiert)
// kein Refactor braucht.
export type { VeranstaltungItem, TimeRange } from './veranstaltungen-data';

interface MonthGroup {
  readonly key: string;
  readonly events: readonly VeranstaltungItem[];
}

interface FilterChip {
  /** Anzeigetext im Chip */
  readonly label: string;
  /** Raw-Typ-Wert fuer Filter-Match (oder ALL_FILTER fuer "Alle") */
  readonly key: string;
}

const ALL_FILTER = '__all__';

@Component({
  selector: 'app-veranstaltungen',
  imports: [EventDetailPanel],
  templateUrl: './veranstaltungen.html',
  styleUrl: './veranstaltungen.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Veranstaltungen {
  private readonly store = inject(VeranstaltungenStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly loading = this.store.loading;
  protected readonly allEvents = computed<readonly VeranstaltungItem[]>(
    () => this.store.events() ?? [],
  );

  /**
   * Liest `?event=<slug>` aus der URL. Dadurch ist das Detail-Panel
   * bookmarkable / shareable / Browser-Back-Button-faehig: Wechselt der
   * Param, oeffnet/schliesst sich das Panel automatisch.
   */
  private readonly eventSlug = toSignal(
    this.route.queryParamMap.pipe(map(p => p.get('event') ?? '')),
    { initialValue: '' },
  );

  /** Aktuell offenes Event — rein abgeleitet aus URL + Daten. */
  protected readonly selectedEvent = computed<VeranstaltungItem | null>(() => {
    const slug = this.eventSlug();
    if (!slug) {
      return null;
    }
    return this.allEvents().find(e => e.slug === slug) ?? null;
  });

  /**
   * Filter-Chips dynamisch aus den vorhandenen Typen ableiten plus
   * "Alle" als ersten Eintrag. So passt sich die Filter-Bar
   * automatisch an wenn der Chef neue Typ-Werte einfuegt.
   */
  protected readonly filters = computed<readonly FilterChip[]>(() => {
    const types = this.store.availableTypes();
    return [
      { key: ALL_FILTER, label: 'Alle' },
      ...types.map(t => ({ key: t.key, label: t.label })),
    ];
  });

  protected readonly activeFilter = signal<string>(ALL_FILTER);
  protected readonly showPast = signal(false);

  protected readonly filtered = computed<readonly VeranstaltungItem[]>(() => {
    const filter = this.activeFilter();
    const includePast = this.showPast();
    return this.allEvents()
      .filter(ev => {
        const matchType = filter === ALL_FILTER || ev.type === filter;
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

  protected readonly allFilter = ALL_FILTER;

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
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { event: event.slug },
      queryParamsHandling: 'merge',
    });
  }

  protected closeDetail(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { event: null },
      queryParamsHandling: 'merge',
    });
  }

  protected onCardKeydown(event: KeyboardEvent, item: VeranstaltungItem): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openDetail(item);
    }
  }
}
