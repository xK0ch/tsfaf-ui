import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Spinner } from '../../shared/spinner/spinner';
import { NEWS_PER_PAGE, NewsStore, type NewsArticle } from './neuigkeiten-data';
import { NewsCover } from './news-cover/news-cover';
import { NewsSidebar } from './news-sidebar/news-sidebar';

interface PageItem {
  readonly article: NewsArticle;
  readonly featured: boolean;
}

@Component({
  selector: 'app-neuigkeiten',
  imports: [RouterLink, NewsCover, NewsSidebar, Spinner],
  templateUrl: './neuigkeiten.html',
  styleUrl: './neuigkeiten.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Neuigkeiten {
  private readonly store = inject(NewsStore);

  protected readonly loading = this.store.loading;
  protected readonly articles = computed<readonly NewsArticle[]>(
    () => this.store.articles() ?? [],
  );
  protected readonly isEmpty = computed(
    () => !this.loading() && this.articles().length === 0,
  );

  protected readonly currentPage = signal(1);

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.articles().length / NEWS_PER_PAGE)),
  );

  protected readonly pageNumbers = computed<readonly number[]>(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1),
  );

  protected readonly pageItems = computed<readonly PageItem[]>(() => {
    const start = (this.currentPage() - 1) * NEWS_PER_PAGE;
    const end = start + NEWS_PER_PAGE;
    return this.articles()
      .slice(start, end)
      .map((article, idx) => ({
        article,
        featured: idx === 0 && this.currentPage() === 1,
      }));
  });

  protected readonly canPrev = computed(() => this.currentPage() > 1);
  protected readonly canNext = computed(() => this.currentPage() < this.totalPages());

  protected goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) {
      return;
    }
    this.currentPage.set(page);
  }

  protected prev(): void {
    this.goToPage(this.currentPage() - 1);
  }

  protected next(): void {
    this.goToPage(this.currentPage() + 1);
  }
}
