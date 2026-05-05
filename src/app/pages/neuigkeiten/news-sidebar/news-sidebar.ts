import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NEWS_ARTICLES } from '../neuigkeiten-data';

@Component({
  selector: 'app-news-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './news-sidebar.html',
  styleUrl: './news-sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsSidebar {
  readonly currentSlug = input<string | null>(null);
  protected readonly articles = NEWS_ARTICLES;
}
