import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { CotasApiService } from '../../core/services/cotas-api.service';
import {
  CotasDanceClass,
  CotasTargetGroup,
} from '../../core/models/cotas.models';

const ALL_CATEGORIES_ID = '__all__';

interface StatusInfo {
  readonly label: string;
  readonly cls: string;
  readonly accent: string;
}

const STATUS_OPEN: StatusInfo = { label: 'Plätze frei', cls: 'badge-open', accent: '#4A8A6E' };
const STATUS_FULL: StatusInfo = { label: 'Ausgebucht',  cls: 'badge-full', accent: '#A8453F' };

const ICON_BY_TARGET_GROUP_BEZ: Readonly<Record<string, string>> = {
  Erwachsene:  '👫',
  Jugendliche: '🎤',
  Kinder:      '⭐',
  Senioren:    '🌿',
  Discofox:    '🕺',
  Kanga:       '👶',
  ZUMBA:       '🌀',
};

@Component({
  selector: 'app-kurse',
  imports: [DecimalPipe, RouterLink],
  templateUrl: './kurse.html',
  styleUrl: './kurse.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Kurse {
  private readonly api = inject(CotasApiService);

  protected readonly allCategoriesId = ALL_CATEGORIES_ID;

  protected readonly catalog = toSignal(this.api.loadCatalog(), { initialValue: null });

  protected readonly activeGroupId = signal<string | null>(null);
  protected readonly activeCategoryId = signal<string>(ALL_CATEGORIES_ID);

  protected readonly targetGroups = computed<readonly CotasTargetGroup[]>(
    () => this.catalog()?.targetGroups ?? [],
  );

  protected readonly currentGroupId = computed<string | null>(() => {
    const explicit = this.activeGroupId();
    if (explicit) return explicit;
    return this.targetGroups()[0]?.id ?? null;
  });

  protected readonly groupCounts = computed<Readonly<Record<string, number>>>(() => {
    const cat = this.catalog();
    const out: Record<string, number> = {};
    if (!cat) return out;
    for (const tg of cat.targetGroups) {
      out[tg.id] = cat.classesByGroup.get(tg.id)?.length ?? 0;
    }
    return out;
  });

  protected readonly categories = computed(() => {
    const cat = this.catalog();
    const gid = this.currentGroupId();
    if (!cat || !gid) return [];
    return cat.categoriesByGroup.get(gid) ?? [];
  });

  protected readonly classesForGroup = computed<readonly CotasDanceClass[]>(() => {
    const cat = this.catalog();
    const gid = this.currentGroupId();
    if (!cat || !gid) return [];
    return cat.classesByGroup.get(gid) ?? [];
  });

  protected readonly filtered = computed<readonly CotasDanceClass[]>(() => {
    const all = this.classesForGroup();
    const catId = this.activeCategoryId();
    if (catId === ALL_CATEGORIES_ID) return all;
    return all.filter(c => c.kategorie_id === catId);
  });

  protected readonly filteredCount = computed(() => this.filtered().length);

  protected readonly activeCategoryLabel = computed<string>(() => {
    const id = this.activeCategoryId();
    if (id === ALL_CATEGORIES_ID) return '';
    return this.categories().find(c => c.id === id)?.bez ?? '';
  });

  // ----- Aktionen -----

  protected selectGroup(id: string): void {
    this.activeGroupId.set(id);
    this.activeCategoryId.set(ALL_CATEGORIES_ID);
  }

  protected selectCategory(id: string): void {
    this.activeCategoryId.set(id);
  }

  protected resetCategory(): void {
    this.activeCategoryId.set(ALL_CATEGORIES_ID);
  }

  // ----- Display-Helpers -----

  protected iconFor(tg: CotasTargetGroup): string {
    return ICON_BY_TARGET_GROUP_BEZ[tg.bez] ?? '✨';
  }

  protected isFull(c: CotasDanceClass): boolean {
    const f = c.full;
    return f === true || f === 1 || f === '1';
  }

  protected status(c: CotasDanceClass): StatusInfo {
    return this.isFull(c) ? STATUS_FULL : STATUS_OPEN;
  }

  protected startTime(c: CotasDanceClass): string {
    if (c.tmpl_start) return c.tmpl_start;
    return (c.start ?? '').slice(0, 5);
  }

  protected duration(c: CotasDanceClass): number {
    const parse = (s: string): number | null => {
      const [h, m] = (s ?? '').split(':').map(n => parseInt(n, 10));
      if (Number.isNaN(h) || Number.isNaN(m)) return null;
      return h * 60 + m;
    };
    const a = parse(c.start);
    const b = parse(c.ende);
    if (a == null || b == null) return 0;
    return Math.max(0, b - a);
  }

  protected priceNumber(c: CotasDanceClass): number {
    const n = parseFloat(c.honorar);
    return Number.isFinite(n) ? n : 0;
  }

  protected priceLabel(c: CotasDanceClass): string {
    const u = parseInt(c.einheiten, 10);
    if (Number.isFinite(u) && u > 0) return `${u} Termine`;
    return '';
  }

  protected description(c: CotasDanceClass): string {
    const raw = c.info_text ?? '';
    const text = raw.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    return text.length > 200 ? text.slice(0, 197) + '...' : text;
  }
}
