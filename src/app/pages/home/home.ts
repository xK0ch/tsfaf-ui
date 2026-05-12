import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { NewsStore, type NewsArticle } from '../neuigkeiten/neuigkeiten-data';

interface Zielgruppe {
  readonly id: string;
  readonly title: string;
  readonly desc: string;
  readonly orange: boolean;
}

interface Tanzstil {
  readonly name: string;
  readonly sub: string;
  readonly icon: string;
  readonly orange: boolean;
}

interface EventItem {
  readonly id: string;
  readonly title: string;
  readonly type: string;
  readonly typeLabel: string;
  readonly day: number;
  readonly monthShort: string;
  readonly time: string;
  readonly price: number;
  readonly priceCard: number | 'frei';
  readonly requiresRegistration: boolean;
  readonly excerpt: string;
}

interface OpeningRow {
  readonly day: string;
  readonly hours: string;
  readonly closed: boolean;
}

const HOME_NEWS_COUNT = 3;

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private readonly newsStore = inject(NewsStore);

  /**
   * News-Teaser auf der Home: die drei neuesten Artikel aus Joomla.
   * Loading-Phase liefert leeres Array (Section ist dann leer aber stoert
   * nicht das Layout).
   */
  protected readonly newsTeaser = computed<readonly NewsArticle[]>(
    () => (this.newsStore.articles() ?? []).slice(0, HOME_NEWS_COUNT),
  );

  protected readonly newsLoading = this.newsStore.loading;

  protected readonly newsEmpty = computed(
    () => !this.newsLoading() && this.newsTeaser().length === 0,
  );

  protected readonly zielgruppen: readonly Zielgruppe[] = [
    { id: 'zg-kinder',      title: 'Kinder',      desc: 'Ab 3 Jahren spielerisch tanzen', orange: true  },
    { id: 'zg-jugendliche', title: 'Jugendliche', desc: 'Hip Hop, Videoclip & mehr',      orange: false },
    { id: 'zg-erwachsene',  title: 'Erwachsene',  desc: 'Discofox, Walzer, Standards',    orange: true  },
    { id: 'zg-senioren',    title: 'Senioren',    desc: 'Zumba Gold, Parkinson-Gruppe',   orange: false },
  ];

  protected readonly tanzstile: readonly Tanzstil[] = [
    { name: 'Discofox',  sub: 'Für alle Levels', icon: '🕺', orange: true  },
    { name: 'Hip Hop',   sub: 'Ab 6 Jahre',      icon: '🎤', orange: false },
    { name: 'Zumba',     sub: 'Fitness & Tanz',  icon: '🌀', orange: true  },
    { name: 'Videoclip', sub: 'Dancing',         icon: '🎬', orange: false },
    { name: 'Kanga',     sub: 'Mit Baby',        icon: '👶', orange: true  },
    { name: 'Handicap',  sub: 'Für alle',        icon: '♿', orange: false },
    { name: 'Parkinson', sub: 'Tanzgruppe',      icon: '💚', orange: true  },
    { name: 'Kinder',    sub: 'Minis ab 3 J.',   icon: '⭐', orange: false },
  ];

  protected readonly events: readonly EventItem[] = [
    {
      id: 'ev-001',
      title: 'Just Dance',
      type: 'JustDance',
      typeLabel: 'Just Dance',
      day: 12, monthShort: 'Apr', time: '17:00 Uhr',
      price: 5, priceCard: 'frei', requiresRegistration: false,
      excerpt: 'Für alle aktiven und ehemaligen Tanzschüler.',
    },
    {
      id: 'ev-002',
      title: 'Discofox-Häppchen inkl. Tanzparty',
      type: 'Workshop',
      typeLabel: 'Workshop',
      day: 18, monthShort: 'Apr', time: '19:00 Uhr',
      price: 15, priceCard: 10, requiresRegistration: true,
      excerpt: 'Discofox-Workshop mit anschließender Tanzparty.',
    },
    {
      id: 'ev-003',
      title: 'Tanz in den Mai',
      type: 'Tanzparty',
      typeLabel: 'Tanzparty',
      day: 30, monthShort: 'Apr', time: '21:00 Uhr',
      price: 10, priceCard: 5, requiresRegistration: true,
      excerpt: 'Vier Stunden Musik und gute Laune.',
    },
  ];

  protected readonly openingHours: readonly OpeningRow[] = [
    { day: 'Montag bis Donnerstag', hours: '15:00 bis 21:30 Uhr',                       closed: false },
    { day: 'Freitag',               hours: '10:00 bis 12:00 und 15:00 bis 21:00 Uhr',   closed: false },
    { day: 'Samstag',               hours: 'nach Veranstaltungsplan',                   closed: false },
    { day: 'Sonntag',               hours: 'geschlossen',                               closed: true  },
  ];
}
