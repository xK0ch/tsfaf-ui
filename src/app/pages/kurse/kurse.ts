import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

import { CotasApiService } from '../../core/services/cotas-api.service';
import {
  CategoryWithClasses,
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

/**
 * Strippt HTML und dekodiert Entities (&ouml;, &amp; etc.) korrekt.
 * Cotas X liefert info_text als HTML-Stueck mit Entities; ein simples
 * Regex-Replace wuerde die nicht aufloesen.
 */
function htmlToText(html: string): string {
  if (!html) return '';
  if (typeof document === 'undefined') {
    // Fallback ohne DOM: nur Tags strippen, Entities bleiben
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent ?? '').replace(/\s+/g, ' ').trim();
}

@Component({
  selector: 'app-kurse',
  imports: [DecimalPipe, RouterLink],
  templateUrl: './kurse.html',
  styleUrl: './kurse.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Kurse {
  private readonly api = inject(CotasApiService);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly allCategoriesId = ALL_CATEGORIES_ID;

  protected readonly catalog = toSignal(this.api.loadCatalog(), { initialValue: null });
  protected readonly config = toSignal(this.api.loadConfig(), { initialValue: null });

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

  /**
   * Anzahl der Termine pro Zielgruppe (fuer die Tabs-Counter). Termine,
   * nicht Kategorien, weil die Tab-Counter dem User die Erwartung "Anzahl
   * an Auswahlmoeglichkeiten" geben.
   */
  protected readonly groupCounts = computed<Readonly<Record<string, number>>>(() => {
    const cat = this.catalog();
    const out: Record<string, number> = {};
    if (!cat) return out;
    for (const tg of cat.targetGroups) {
      out[tg.id] = cat.classesByGroup.get(tg.id)?.length ?? 0;
    }
    return out;
  });

  protected readonly categories = computed<readonly CategoryWithClasses[]>(() => {
    const cat = this.catalog();
    const gid = this.currentGroupId();
    if (!cat || !gid) return [];
    return cat.categoriesByGroup.get(gid) ?? [];
  });

  /**
   * Sichtbare Kategorien-Karten. Bei "Alle" alle Kategorien, sonst nur die
   * eine ausgewaehlte. Jede Karte rendert intern alle ihre Termine.
   */
  protected readonly filteredCategories = computed<readonly CategoryWithClasses[]>(() => {
    const cats = this.categories();
    const catId = this.activeCategoryId();
    if (catId === ALL_CATEGORIES_ID) return cats;
    return cats.filter(c => c.id === catId);
  });

  protected readonly filteredCategoryCount = computed(() => this.filteredCategories().length);

  protected readonly filteredTermineCount = computed(() => {
    let n = 0;
    for (const c of this.filteredCategories()) n += c.classes.length;
    return n;
  });

  protected readonly activeCategoryLabel = computed<string>(() => {
    const id = this.activeCategoryId();
    if (id === ALL_CATEGORIES_ID) return '';
    return this.categories().find(c => c.id === id)?.bez ?? '';
  });

  /**
   * Globaler Infotext-Banner ueber den Cards: greift wenn die aktuelle
   * Auswahl mind. eine Kategorie zeigt, fuer die ein Infotext konfiguriert
   * ist. Bei "Alle"-Tab zeigen wir den ersten matchenden, weil sonst die
   * Anzeige zu voll wird; spezifische Infotexte rendern wir ZUSAETZLICH
   * pro Karte (siehe infotextForCategory).
   */
  protected readonly currentInfotextHtml = computed<SafeHtml | null>(() => {
    const cfg = this.config();
    if (!cfg || !cfg.infotexts.length) return null;
    if (this.activeCategoryId() === ALL_CATEGORIES_ID) return null;

    const visibleCategoryIds = new Set([this.activeCategoryId()]);
    for (const it of cfg.infotexts) {
      const matches = it.category_ids.some(id => visibleCategoryIds.has(id));
      if (matches) {
        return this.sanitizer.bypassSecurityTrustHtml(it.body);
      }
    }
    return null;
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

  protected isFull(c: CotasDanceClass): boolean {
    const f = c.full;
    return f === true || f === 1 || f === '1';
  }

  /**
   * Kategorie ist auf "no_online_registration" geflaggt: User muss
   * stattdessen anrufen.
   */
  protected isOnlineRegistrationBlockedById(categoryId: string): boolean {
    const cfg = this.config();
    if (!cfg) return false;
    return cfg.no_online_registration.includes(categoryId);
  }

  protected isOnlineRegistrationBlocked(c: CotasDanceClass): boolean {
    return this.isOnlineRegistrationBlockedById(c.kategorie_id);
  }

  /** Per-Kategorie Infotext (kommt zusaetzlich zum globalen Banner). */
  protected infotextForCategory(categoryId: string): SafeHtml | null {
    const cfg = this.config();
    if (!cfg) return null;
    for (const it of cfg.infotexts) {
      if (it.category_ids.includes(categoryId)) {
        return this.sanitizer.bypassSecurityTrustHtml(it.body);
      }
    }
    return null;
  }

  protected phoneNumber(): string {
    return this.config()?.phone ?? '04321 1 49 00';
  }

  protected phoneHref(): string {
    return 'tel:+49' + this.phoneNumber().replace(/[^\d]/g, '').replace(/^0/, '');
  }

  protected status(c: CotasDanceClass): StatusInfo {
    return this.isFull(c) ? STATUS_FULL : STATUS_OPEN;
  }

  protected startTime(c: CotasDanceClass): string {
    if (c.tmpl_start) return c.tmpl_start;
    return (c.start ?? '').slice(0, 5);
  }

  protected endTime(c: CotasDanceClass): string {
    return (c.ende ?? '').slice(0, 5);
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

  protected weeksLabel(c: CotasDanceClass): string {
    const u = parseInt(c.einheiten, 10);
    if (Number.isFinite(u) && u > 0) return `${u} Wochen`;
    return '';
  }

  /**
   * Kurzbeschreibung pro Kategorie. Nimmt info_text vom ersten Termin
   * (innerhalb einer Kategorie ist das textuell identisch) und strippt das
   * HTML auf ~200 Zeichen.
   */
  protected descriptionFor(cat: CategoryWithClasses): string {
    const first = cat.classes[0];
    if (!first) return '';
    const text = htmlToText(first.info_text ?? '');
    return text.length > 200 ? text.slice(0, 197) + '...' : text;
  }

  /** Wenn alle Termine der Kategorie ausgebucht sind. */
  protected categoryFull(cat: CategoryWithClasses): boolean {
    if (cat.classes.length === 0) return false;
    return cat.classes.every(t => this.isFull(t));
  }
}
