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
  readonly label: string;
  readonly key: string;
}

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

  // ─── Event-Detail-Panel (URL-Sync `?event=`) ────────────────────

  private readonly eventSlug = toSignal(
    this.route.queryParamMap.pipe(map(p => p.get('event') ?? '')),
    { initialValue: '' },
  );

  protected readonly selectedEvent = computed<VeranstaltungItem | null>(() => {
    const slug = this.eventSlug();
    if (!slug) return null;
    return this.allEvents().find(e => e.slug === slug) ?? null;
  });

  // ─── Multi-Select Filter (URL-Sync `?typ=`) ─────────────────────
  //
  // URL-Format: komma-separierte Liste von Typ-Keys, z.B.
  //   /veranstaltungen?typ=workshop,tanzparty
  // Leerer/fehlender Param == keine Filter aktiv == "Alle" wird angezeigt.

  private readonly urlTypesParam = toSignal(
    this.route.queryParamMap.pipe(map(p => p.get('typ') ?? '')),
    { initialValue: '' },
  );

  protected readonly activeTypes = computed<ReadonlySet<string>>(() => {
    const raw = this.urlTypesParam();
    if (!raw) return new Set<string>();
    return new Set(raw.split(',').map(s => s.trim()).filter(Boolean));
  });

  protected readonly filters = computed<readonly FilterChip[]>(() => {
    const types = this.store.availableTypes();
    return types.map(t => ({ key: t.key, label: t.label }));
  });

  protected readonly showPast = signal(false);

  protected readonly filtered = computed<readonly VeranstaltungItem[]>(() => {
    const active = this.activeTypes();
    const includePast = this.showPast();
    return this.allEvents()
      .filter(ev => {
        const matchType = active.size === 0 || active.has(ev.type);
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

  // ─── Aktionen ────────────────────────────────────────────────────

  /**
   * Toggle eines Typs. Wenn schon aktiv -> raus aus dem Set. Wenn neu ->
   * dazu. Resultierendes Set landet als komma-Liste in der URL; leerer
   * Set -> Param wird entfernt (= "Alle").
   */
  protected toggleFilter(key: string): void {
    const next = new Set(this.activeTypes());
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    this.navigateTypes(next);
  }

  /** Setzt alle Typ-Filter zurueck (= "Alle"-Chip-Klick). */
  protected clearFilters(): void {
    this.navigateTypes(new Set());
  }

  private navigateTypes(set: ReadonlySet<string>): void {
    // Alphabetische Sortierung damit die URL bei gleichem Filter-Stand
    // identisch aussieht, egal in welcher Reihenfolge geklickt wurde
    // (besser bookmarkable + cacheable).
    const value = set.size === 0 ? null : Array.from(set).sort().join(',');
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { typ: value },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected togglePast(): void {
    this.showPast.update(v => !v);
  }

  /**
   * "Alle anzeigen"-Notausgang im Empty-State: filter komplett zuruecksetzen
   * UND auch vergangene Events sichtbar machen.
   */
  protected showAll(): void {
    this.showPast.set(true);
    this.clearFilters();
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
