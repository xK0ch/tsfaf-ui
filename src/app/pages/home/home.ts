import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { NewsStore, type NewsArticle } from '../neuigkeiten/neuigkeiten-data';
import {
  VeranstaltungenStore,
  type VeranstaltungItem,
} from '../veranstaltungen/veranstaltungen-data';

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

interface OpeningRow {
  readonly day: string;
  readonly hours: string;
  readonly closed: boolean;
}

const HOME_NEWS_COUNT = 3;
const HOME_EVENTS_COUNT = 3;

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private readonly newsStore = inject(NewsStore);
  private readonly eventsStore = inject(VeranstaltungenStore);

  /**
   * Events-Teaser auf der Home: die naechsten max. 3 kommenden
   * Veranstaltungen aus Joomla. Vergangene werden ausgefiltert,
   * dann nach Start aufsteigend sortiert.
   */
  protected readonly eventsTeaser = computed<readonly VeranstaltungItem[]>(() => {
    const all = this.eventsStore.events() ?? [];
    return [...all]
      .filter(ev => !ev.past)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, HOME_EVENTS_COUNT);
  });

  protected readonly eventsLoading = this.eventsStore.loading;
  protected readonly eventsEmpty = computed(
    () => !this.eventsLoading() && this.eventsTeaser().length === 0,
  );

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

  protected readonly openingHours: readonly OpeningRow[] = [
    { day: 'Sonntag bis Freitag', hours: '14:30 bis 21:00 Uhr', closed: false },
    { day: 'Samstag',             hours: '19:30 bis 23:00 Uhr', closed: false },
  ];
}
