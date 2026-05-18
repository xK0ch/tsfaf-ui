import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  viewChild,
} from '@angular/core';
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
  /** Slug fuer den `?gruppe=`-QueryParam auf /kurse. */
  readonly gruppe: string;
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

  private readonly heroVideo = viewChild<ElementRef<HTMLVideoElement>>('heroVideo');

  /**
   * Programmatischer Autoplay-Start. Wird vom `loadedmetadata`-Event
   * des Hero-Videos aufgerufen — also genau dann wenn der Browser
   * weiss wie er das Video abspielen kann.
   *
   * Warum nicht nur das `autoplay`-Attribut: Browser-Autoplay-Policies
   * sind streng (Battery-Saver-Mode, Low-Power-Mode, manche corporate
   * Profile blocken stummes Autoplay sogar). Dieser Call ist die
   * zweite Chance: wir setzen `muted = true` explizit auf Property-
   * Ebene und triggern play(). Wenn der Browser dann TROTZDEM blockt,
   * fangen wir den Rejection und tun nichts — das Video bleibt halt
   * stehen, Hero-Text + Overlay bleiben sichtbar (kein White-Screen).
   */
  protected playHeroVideo(): void {
    const el = this.heroVideo()?.nativeElement;
    if (!el) return;
    el.muted = true;
    void el.play().catch(() => {
      // Browser hat Autoplay endgueltig geblockt (sehr selten bei
      // muted+playsinline). Wir akzeptieren das und zeigen den
      // ersten Frame stehend.
    });
  }

  /**
   * Events-Teaser auf der Home: die naechsten max. 3 kommenden
   * Veranstaltungen aus Joomla. Vergangene werden ausgefiltert,
   * dann nach Start aufsteigend sortiert.
   */
  protected readonly eventsTeaser = computed<readonly VeranstaltungItem[]>(() => {
    const all = this.eventsStore.events() ?? [];
    return [...all]
      .filter((ev) => !ev.past)
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
  protected readonly newsTeaser = computed<readonly NewsArticle[]>(() =>
    (this.newsStore.articles() ?? []).slice(0, HOME_NEWS_COUNT),
  );

  protected readonly newsLoading = this.newsStore.loading;

  protected readonly newsEmpty = computed(
    () => !this.newsLoading() && this.newsTeaser().length === 0,
  );

  protected readonly zielgruppen: readonly Zielgruppe[] = [
    {
      id: 'zg-kinder',
      title: 'Kinder',
      desc: 'Ab 2 Jahren spielerisch tanzen',
      orange: true,
      gruppe: 'kinder',
    },
    {
      id: 'zg-jugendliche',
      title: 'Jugendliche',
      desc: 'Hip Hop, Videoclip & mehr',
      orange: false,
      gruppe: 'jugendliche',
    },
    {
      id: 'zg-erwachsene',
      title: 'Erwachsene',
      desc: 'Standards, Line-Dance & mehr',
      orange: true,
      gruppe: 'erwachsene',
    },
    {
      id: 'zg-senioren',
      title: 'Senioren',
      desc: 'Parkinson-Gruppe, Agilando',
      orange: false,
      gruppe: 'senioren',
    },
  ];

  protected readonly openingHours: readonly OpeningRow[] = [
    { day: 'Sonntag bis Freitag', hours: '14:30 bis 21:00 Uhr', closed: false },
    { day: 'Samstag', hours: '19:30 bis 23:00 Uhr', closed: false },
  ];
}
