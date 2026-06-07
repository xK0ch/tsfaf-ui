import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { JoomlaApiService } from '../../core/services/joomla-api.service';
import type { JoomlaArticle } from '../../core/models/joomla.models';

// ----- Lokale Typen / Konstanten -----

const ALL_CATEGORY = 'Alle';
/** Fallback wenn ein FAQ-Artikel kein typ-faq-Feld gesetzt hat. */
const FALLBACK_CATEGORY = 'Allgemein';

interface FaqItem {
  readonly id: string;
  readonly q: string;
  readonly a: string;
}

interface FaqGroup {
  readonly category: string;
  readonly items: readonly FaqItem[];
}

interface CategoryEntry {
  readonly name: string;
  readonly count: number;
}

interface RenderedFaqItem extends FaqItem {
  readonly questionHtml: string;
  readonly answerHtml: string;
}

interface RenderedFaqGroup {
  readonly category: string;
  readonly items: readonly RenderedFaqItem[];
}

// ----- Highlight Helpers -----

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text: string, query: string): string {
  const escaped = escapeHtml(text);
  if (!query.trim()) return escaped;
  const re = new RegExp(`(${escapeRegex(escapeHtml(query))})`, 'gi');
  return escaped.replace(re, '<mark>$1</mark>');
}

function highlightHtml(html: string, query: string): string {
  if (!query.trim()) return html;
  const re = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return html.replace(/(<[^>]+>)|([^<]+)/g, (_, tag: string | undefined, text: string | undefined) => {
    if (tag) return tag;
    if (!text) return '';
    return text.replace(re, '<mark>$1</mark>');
  });
}

// ----- Custom-Field Reader + Grouping -----

/**
 * Joomla liefert List-Fields als `{key: displayText}`. Wir nehmen den
 * Key als kanonischen Wert; bei String/leer/Sonstigem nutzen wir den
 * Fallback. Same Idee wie bei Veranstaltungen.
 */
function readTypFaq(value: unknown): string {
  if (!value) return FALLBACK_CATEGORY;
  if (typeof value === 'string') return value || FALLBACK_CATEGORY;
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>);
    return keys[0] ? String(keys[0]) : FALLBACK_CATEGORY;
  }
  return FALLBACK_CATEGORY;
}

/**
 * Gruppiert FAQs nach typ-faq-Custom-Field-Wert. Gruppen alphabetisch
 * sortiert. Innerhalb einer Gruppe bleibt die API-Reihenfolge erhalten.
 */
export function buildFaqGroups(articles: readonly JoomlaArticle[]): readonly FaqGroup[] {
  const byCat = new Map<string, FaqItem[]>();
  for (const a of articles) {
    const cat = readTypFaq((a as Record<string, unknown>)['typ-faq']);
    const list = byCat.get(cat) ?? [];
    list.push({
      id: a.alias || `faq-${a.id}`,
      q: a.title,
      a: a.text,
    });
    byCat.set(cat, list);
  }
  return Array.from(byCat.entries())
    .map(([category, items]) => ({ category, items }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

@Component({
  selector: 'app-faq',
  imports: [RouterLink],
  templateUrl: './faq.html',
  styleUrl: './faq.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Faq {
  private readonly api = inject(JoomlaApiService);

  // ----- Daten laden -----

  /**
   * Alle FAQs aus Kategorie 9 mit einem Call holen, anhand des
   * typ-faq-Custom-Fields client-seitig in Gruppen aufteilen. Pflege
   * im Joomla erfolgt nur noch ueber das List-Field — keine Sub-
   * Kategorien mehr.
   */
  protected readonly faqGroups = toSignal<readonly FaqGroup[] | null>(
    this.api
      .listArticles({ categoryId: environment.joomlaCategoryFaq, limit: 200 })
      .pipe(map(items => buildFaqGroups(items))),
    { initialValue: null },
  );

  protected readonly loading = computed(() => this.faqGroups() === null);

  protected readonly totalItemCount = computed<number>(() =>
    (this.faqGroups() ?? []).reduce((s, g) => s + g.items.length, 0),
  );

  // ----- UI-State -----

  protected readonly query = signal('');
  protected readonly activeCategory = signal<string>(ALL_CATEGORY);
  protected readonly openId = signal<string | null>(null);

  protected readonly allCategoryName = ALL_CATEGORY;

  protected readonly categories = computed<readonly CategoryEntry[]>(() => {
    return [
      { name: ALL_CATEGORY, count: this.totalItemCount() },
      ...(this.faqGroups() ?? []).map(g => ({ name: g.category, count: g.items.length })),
    ];
  });

  protected readonly filteredGroups = computed<readonly RenderedFaqGroup[]>(() => {
    const q = this.query().toLowerCase().trim();
    const cat = this.activeCategory();
    const result: RenderedFaqGroup[] = [];
    for (const group of this.faqGroups() ?? []) {
      if (cat !== ALL_CATEGORY && group.category !== cat) continue;
      const items: RenderedFaqItem[] = [];
      for (const item of group.items) {
        if (q && !item.q.toLowerCase().includes(q) && !item.a.toLowerCase().includes(q)) continue;
        items.push({
          ...item,
          questionHtml: highlightText(item.q, this.query()),
          answerHtml: highlightHtml(item.a, this.query()),
        });
      }
      if (items.length > 0) {
        result.push({ category: group.category, items });
      }
    }
    return result;
  });

  protected readonly totalVisible = computed(() =>
    this.filteredGroups().reduce((sum, g) => sum + g.items.length, 0),
  );

  protected readonly hasResults = computed(() => this.filteredGroups().length > 0);

  protected readonly showSectionTitles = computed(
    () => this.activeCategory() === ALL_CATEGORY || this.query().length > 0,
  );

  protected onQueryInput(value: string): void {
    this.query.set(value);
    if (value) {
      this.activeCategory.set(ALL_CATEGORY);
    }
  }

  protected selectCategory(name: string): void {
    this.activeCategory.set(name);
    this.query.set('');
  }

  protected toggleItem(id: string): void {
    this.openId.update(current => (current === id ? null : id));
  }
}
