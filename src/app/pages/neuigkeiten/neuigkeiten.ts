import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NEWS_ARTICLES, NEWS_PER_PAGE, type NewsArticle } from './neuigkeiten-data';
import { NewsCover } from './news-cover/news-cover';
import { NewsSidebar } from './news-sidebar/news-sidebar';

interface PageItem {
  readonly article: NewsArticle;
  readonly featured: boolean;
}

@Component({
  selector: 'app-neuigkeiten',
  imports: [RouterLink, NewsCover, NewsSidebar],
  templateUrl: './neuigkeiten.html',
  styleUrl: './neuigkeiten.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Neuigkeiten {
  protected readonly currentPage = signal(1);

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(NEWS_ARTICLES.length / NEWS_PER_PAGE)),
  );

  protected readonly pageNumbers = computed<readonly number[]>(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1),
  );

  protected readonly pageItems = computed<readonly PageItem[]>(() => {
    const start = (this.currentPage() - 1) * NEWS_PER_PAGE;
    const end = start + NEWS_PER_PAGE;
    return NEWS_ARTICLES.slice(start, end).map((article, idx) => ({
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
