import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { Spinner } from '../../../shared/spinner/spinner';
import { NewsStore, type NewsArticle } from '../neuigkeiten-data';

@Component({
  selector: 'app-news-sidebar',
  imports: [RouterLink, RouterLinkActive, Spinner],
  templateUrl: './news-sidebar.html',
  styleUrl: './news-sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsSidebar {
  readonly currentSlug = input<string | null>(null);

  private readonly store = inject(NewsStore);
  protected readonly articles = computed<readonly NewsArticle[]>(
    () => this.store.articles() ?? [],
  );
  protected readonly loading = this.store.loading;
}
