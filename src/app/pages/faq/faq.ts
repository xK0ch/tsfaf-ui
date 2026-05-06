import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DOCUMENT,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ALL_CATEGORY,
  FAQ_GROUPS,
  FaqGroup,
  FaqItem,
  TOTAL_ITEM_COUNT,
} from './faq-data';

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
  if (!query.trim()) {
    return escaped;
  }
  const re = new RegExp(`(${escapeRegex(escapeHtml(query))})`, 'gi');
  return escaped.replace(re, '<mark>$1</mark>');
}

function highlightHtml(html: string, query: string): string {
  if (!query.trim()) {
    return html;
  }
  const re = new RegExp(`(${escapeRegex(query)})`, 'gi');
  // Only highlight inside text nodes between tags by splitting on tags.
  return html.replace(/(<[^>]+>)|([^<]+)/g, (_, tag: string | undefined, text: string | undefined) => {
    if (tag) {
      return tag;
    }
    if (!text) {
      return '';
    }
    return text.replace(re, '<mark>$1</mark>');
  });
}

@Component({
  selector: 'app-faq',
  imports: [RouterLink],
  templateUrl: './faq.html',
  styleUrl: './faq.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Faq {
  private readonly document = inject(DOCUMENT);

  protected readonly query = signal('');
  protected readonly activeCategory = signal<string>(ALL_CATEGORY);
  protected readonly openId = signal<string | null>(null);

  protected readonly allCategoryName = ALL_CATEGORY;

  protected readonly categories = computed<readonly CategoryEntry[]>(() => {
    return [
      { name: ALL_CATEGORY, count: TOTAL_ITEM_COUNT },
      ...FAQ_GROUPS.map(g => ({ name: g.category, count: g.items.length })),
    ];
  });

  protected readonly filteredGroups = computed<readonly RenderedFaqGroup[]>(() => {
    const q = this.query().toLowerCase().trim();
    const cat = this.activeCategory();
    const result: RenderedFaqGroup[] = [];
    for (const group of FAQ_GROUPS) {
      if (cat !== ALL_CATEGORY && group.category !== cat) {
        continue;
      }
      const items: RenderedFaqItem[] = [];
      for (const item of group.items) {
        if (q && !item.q.toLowerCase().includes(q) && !item.a.toLowerCase().includes(q)) {
          continue;
        }
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

  constructor() {
    const win = this.document.defaultView;
    const initialHash = win?.location.hash.slice(1) ?? '';
    if (initialHash) {
      this.openId.set(initialHash);
    }

    effect(() => {
      const id = this.openId();
      const w = this.document.defaultView;
      if (!w?.history) {
        return;
      }
      if (id) {
        w.history.replaceState(null, '', `#${id}`);
      } else if (w.location.hash) {
        w.history.replaceState(null, '', w.location.pathname + w.location.search);
      }
    });
  }

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
