import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { Spinner } from '../../shared/spinner/spinner';
import { environment } from '../../../environments/environment';
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
  /**
   * Hintergrund-Foto (full-bleed in der Card). Liegt auf dem
   * externen Media-Storage (siehe environment.mediaBaseUrl).
   */
  readonly imageUrl: string;
  readonly imageAlt: string;
  /** Inspirierender Untertitel, der im Detail-Panel als h3 erscheint. */
  readonly longTitle: string;
  /** Langfassung — mehrzeiliger Beschreibungstext im Detail-Panel. */
  readonly longText: string;
  /** Wort, das im CTA-Button erscheint ("Zu den <ctaLabel>"). */
  readonly ctaLabel: string;
}

const MEDIA_BASE = environment.mediaBaseUrl;

interface OpeningRow {
  readonly day: string;
  readonly hours: string;
  readonly closed: boolean;
}

const HOME_NEWS_COUNT = 3;
const HOME_EVENTS_COUNT = 3;

@Component({
  selector: 'app-home',
  imports: [RouterLink, NgOptimizedImage, Spinner],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private readonly newsStore = inject(NewsStore);
  private readonly eventsStore = inject(VeranstaltungenStore);

  private readonly heroVideo = viewChild<ElementRef<HTMLVideoElement>>('heroVideo');

  /** URL des Hero-Videos. Liegt auf dem externen Media-Storage. */
  protected readonly heroVideoUrl = `${MEDIA_BASE}/Homepagevideo.mp4`;

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
      desc: 'Ab 1,5 Jahren spielerisch tanzen',
      orange: true,
      gruppe: 'kinder',
      imageUrl: `${MEDIA_BASE}/Altersgruppen/kinder.png`,
      imageAlt: 'Tanzende Kinder in der Tanzschule',
      longTitle: 'Ein Ort zum Entfalten',
      longText:
        'In einer geborgenen Atmosphäre dürfen Kinder bei uns ganz bei sich ankommen. ' +
        'In ihren jeweiligen Altersstufen entdecken sie spielerisch die Freude an der Bewegung. ' +
        'Mit viel Ruhe und Raum für Kreativität stärken wir gemeinsam ihr Selbstvertrauen und ' +
        'finden ihren ganz eigenen Rhythmus, ein harmonisches Zusammenspiel von Körper und Seele.',
      ctaLabel: 'Kinder-Kursen',
    },
    {
      id: 'zg-jugendliche',
      title: 'Jugendliche',
      desc: 'Hip Hop, Videoclip & mehr',
      orange: false,
      gruppe: 'jugendliche',
      imageUrl: `${MEDIA_BASE}/Altersgruppen/jugendliche.png`,
      imageAlt: 'Jugendliche beim Tanzen',
      longTitle: 'Dein Raum zum Tanzen und Sein',
      longText:
        'Hier findest du weit mehr als nur neue Schritte. In einer entspannten Atmosphäre ' +
        'bieten wir dir den Raum, gemeinsam mit Freunden abzutauchen, neue Leute kennenzulernen ' +
        'und einfach du selbst zu sein. Tanzen verbindet uns, ohne Druck, dafür mit viel Gefühl ' +
        'für den Moment und der Freude daran, gemeinsam über sich hinauszuwachsen.',
      ctaLabel: 'Jugend-Kursen',
    },
    {
      id: 'zg-erwachsene',
      title: 'Erwachsene',
      desc: 'Discofox, Standards & mehr',
      orange: true,
      gruppe: 'erwachsene',
      imageUrl: `${MEDIA_BASE}/Altersgruppen/erwachsene.png`,
      imageAlt: 'Erwachsene beim Paartanz',
      longTitle: 'Zeit für euch, Schritt für Schritt',
      longText:
        'Gönnt euch eine Auszeit vom Alltag und genießt das schönste Hobby zu zweit. ' +
        'In einer Atmosphäre voller Herzlichkeit findet ihr bei uns den Raum, wieder ganz ' +
        'bewusst Zeit füreinander zu haben. Während wir gemeinsam in die Welt der Standard- ' +
        'und lateinamerikanischen Tänze eintauchen, entdeckt ihr mit Leichtigkeit neue ' +
        'Bewegungen und tut gleichzeitig Körper und Seele etwas Gutes.',
      ctaLabel: 'Erwachsenen-Kursen',
    },
    {
      id: 'zg-senioren',
      title: 'Senioren',
      desc: 'Tanzen hält Körper und Geist fit',
      orange: false,
      gruppe: 'senioren',
      imageUrl: `${MEDIA_BASE}/Altersgruppen/senioren.png`,
      imageAlt: 'Senioren beim Tanzen',
      longTitle: 'Lebensfreude im Einklang',
      longText:
        'Tanzen ist Balsam für die Seele und hält uns auf sanfte Weise jung. Ganz gleich, ' +
        'ob ihr als Paar kommt oder allein zu uns findet, in einer herzlichen Gemeinschaft ' +
        'genießen wir die Freude an der Bewegung. Ohne Leistungsdruck, dafür mit viel Gefühl ' +
        'und Achtsamkeit, stärken wir Körper und Geist und lassen jeden Schritt zu einem ' +
        'Moment des Wohlbefindens werden.',
      ctaLabel: 'Senioren-Kursen',
    },
  ];

  // ─── Detail-Panel-Toggle ──────────────────────────────────────
  // Klick auf eine Card markiert sie als aktiv und blendet unter dem
  // Grid ein Detail-Panel mit Langtext + CTA ein. Erneuter Klick auf
  // dieselbe Card schliesst, Klick auf andere wechselt.

  private readonly selectedZielgruppeId = signal<string | null>(null);

  protected readonly selectedZielgruppe = computed<Zielgruppe | null>(() => {
    const id = this.selectedZielgruppeId();
    if (!id) return null;
    return this.zielgruppen.find(z => z.id === id) ?? null;
  });

  protected isZielgruppeActive(id: string): boolean {
    return this.selectedZielgruppeId() === id;
  }

  protected toggleZielgruppe(id: string): void {
    const next = this.selectedZielgruppeId() === id ? null : id;
    this.selectedZielgruppeId.set(next);
    if (next) {
      // Auf Mobile sitzt das Panel weit unter dem Grid — scroll-into-view
      // damit der User sofort sieht dass sich was getan hat. requestAnimationFrame
      // wartet auf den DOM-Render bevor wir scrollen.
      requestAnimationFrame(() => {
        document
          .getElementById('zg-detail-panel')
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  }

  protected closeZielgruppe(): void {
    this.selectedZielgruppeId.set(null);
  }

  protected readonly openingHours: readonly OpeningRow[] = [
    { day: 'Mo bis Fr', hours: '14:30 bis 22:30 Uhr', closed: false },
    { day: 'Samstag', hours: '17:00 bis 23:00 Uhr', closed: false },
    { day: 'Sonntag', hours: '14:30 bis 21:30 Uhr', closed: false },
  ];
}
