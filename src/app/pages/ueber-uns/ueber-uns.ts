import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Spinner } from '../../shared/spinner/spinner';
import { environment } from '../../../environments/environment';
import { type Photo } from '../galerie/galerie-data';
import { Lightbox } from '../galerie/lightbox/lightbox';
import { TeamCard } from './team-card/team-card';
import { TeamStore, type TeamMember } from './ueber-uns-data';

const MEDIA_BASE = environment.mediaBaseUrl;

/**
 * URL des Tanzschulfilms. Liegt auf dem eigenen Subdomain video.tsfaf.de
 * (Apache mit Range-Request-Support, kein Drittanbieter im DSGVO-Sinne).
 * Wird erst nach Klick auf das Poster geladen — analog zur OSM-Karte
 * auf der Kontaktseite. Spart Bandbreite und vermeidet automatisches
 * Abspielen.
 */
const TANZSCHULFILM_URL = `${MEDIA_BASE}/Tanzschulfilm.mp4`;

interface HeroStat {
  readonly value: string;
  readonly label: string;
}

interface Partner {
  readonly id: string;
  readonly name: string;
  readonly imageUrl: string;
  readonly imageAlt: string;
  /**
   * Partner-Webseite. Einige Links sind aktuell veraltet (404) — werden
   * vom Chef nachgeliefert. Bis dahin bleiben sie hier dokumentiert.
   */
  readonly url: string;
}

interface ValueCard {
  readonly icon: string;
  readonly label: string;
  readonly desc: string;
  readonly orange: boolean;
}

interface Room {
  readonly id: string;
  readonly name: string;
  readonly detail: string;
  readonly orange: boolean;
  /**
   * Foto des Raums, full-bleed im Card-Hintergrund. Liegt auf dem
   * externen Media-Storage unter /Raeumlichkeiten/<Name>.JPG.
   */
  readonly imageUrl: string;
  readonly imageAlt: string;
}

@Component({
  selector: 'app-ueber-uns',
  imports: [RouterLink, TeamCard, NgOptimizedImage, Lightbox, Spinner],
  templateUrl: './ueber-uns.html',
  styleUrl: './ueber-uns.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UeberUns {
  private readonly teamStore = inject(TeamStore);

  /**
   * Team-Mitglieder aus Joomla (Kategorie "Team", id 13). Sortiert per
   * Joomla-Ordering. Im Loading wird ein kleiner Hinweis gezeigt.
   */
  protected readonly team = computed<readonly TeamMember[]>(
    () => this.teamStore.members() ?? [],
  );
  protected readonly teamLoading = this.teamStore.loading;
  protected readonly teamEmpty = computed(
    () => !this.teamLoading() && this.team().length === 0,
  );

  protected readonly heroStats: readonly HeroStat[] = [
    { value: '10+',    label: 'Jahre Erfahrung' },
    { value: '700 m²', label: 'Tanzfläche' },
    { value: '3 Säle', label: 'mit moderner Technik' },
    { value: '5',      label: 'qualifizierte Lehrkräfte' },
  ];

  /**
   * Partner-Logos aus dem alten Joomla-Footer. Liegen jetzt auf dem
   * externen Media-Storage (siehe environment.mediaBaseUrl), damit
   * das Build-Bundle schlank bleibt.
   */
  protected readonly partners: readonly Partner[] = [
    {
      id: 'adtv',
      name: 'ADTV',
      imageUrl: `${MEDIA_BASE}/Partner/adtv.gif`,
      imageAlt: 'Allgemeiner Deutscher Tanzlehrerverband',
      url: 'https://adtv.de/',
    },
    {
      id: 'agilando',
      name: 'Agilando',
      imageUrl: `${MEDIA_BASE}/Partner/agilando.png`,
      imageAlt: 'Agilando — Tanzen für Best Ager',
      url: 'https://www.tanzen.de/agilando/',
    },
    {
      id: 'dance4fans',
      name: 'Dance4Fans',
      imageUrl: `${MEDIA_BASE}/Partner/d4f.png`,
      imageAlt: 'Dance4Fans',
      url: 'http://www.dance4fans.de/',
    },
    {
      id: 'dadanza',
      name: 'Dadanza',
      imageUrl: `${MEDIA_BASE}/Partner/dadanza.gif`,
      imageAlt: 'Dadanza — Tanzschuhe online kaufen',
      url: 'https://www.dadanza.de/',
    },
    {
      id: 'kanga',
      name: 'Kangatraining',
      imageUrl: `${MEDIA_BASE}/Partner/kanga_logo.png`,
      imageAlt: 'Kangatraining',
      url: 'https://kangatraining.info/',
    },
    {
      id: 'zumba',
      name: 'Zumba Fitness',
      imageUrl: `${MEDIA_BASE}/Partner/zumba.svg`,
      imageAlt: 'Zumba Fitness',
      url: 'https://www.zumba.com/de-DE/',
    },
  ];

  protected readonly values: readonly ValueCard[] = [
    { icon: '🤝', label: 'Gemeinschaft',   desc: 'Bei uns tanzt du nie allein. Wir sind eine Gemeinschaft aus allen Altersgruppen und Tanzlevels.',                                              orange: true  },
    { icon: '📜', label: 'ADTV-Qualität',  desc: 'Als ADTV-zertifizierte Tanzschule stehen wir für geprüfte Ausbildung und höchste Lehrqualität.',                                              orange: false },
    { icon: '🌈', label: 'Für alle',       desc: 'Von 1,5 bis 90: unser Angebot reicht von den Minis bis zur Parkinson-Gruppe, niemand wird ausgelassen.',                                        orange: true  },
    { icon: '📍', label: 'Neumünster',     desc: '700 m² reine Tanzfläche in einem 1.500 m² großen Gebäude auf 3.600 m² Grundstück. Drei moderne Säle, Foyer mit Bar, Licht- und Soundtechnik auf dem neuesten Stand.',                              orange: false },
    { icon: '❤️', label: 'Mit Herz',       desc: 'Seit über 10 Jahren tanzen wir mit Leidenschaft und freuen uns über jeden neuen Tanzschüler.',                                                orange: true  },
    { icon: '🎓', label: 'Weiterbildung',  desc: 'Unser Team bildet sich kontinuierlich weiter: neue Stile, neue Methoden, immer auf dem neuesten Stand.',                                      orange: false },
  ];

  // ─── Tanzschulfilm ────────────────────────────────────────────
  //
  // Click-to-load pattern: erst beim Klick auf das Poster wird das
  // <video>-Element gerendert und der Stream gestartet. Vermeidet
  // ungewolltes Vorladen (371 MB) und ist datenschutzfreundlich.
  protected readonly videoUrl = TANZSCHULFILM_URL;
  protected readonly videoLoaded = signal(false);

  protected loadVideo(): void {
    this.videoLoaded.set(true);
  }

  protected readonly rooms: readonly Room[] = [
    {
      id: 'r-saal-1',
      name: 'Saal 1',
      detail: 'ca. 260 m²',
      orange: true,
      imageUrl: `${MEDIA_BASE}/Raeumlichkeiten/Saal_1.JPG`,
      imageAlt: 'Innenansicht von Saal 1 mit Tanzfläche',
    },
    {
      id: 'r-saal-2',
      name: 'Saal 2',
      detail: 'ca. 200 m²',
      orange: false,
      imageUrl: `${MEDIA_BASE}/Raeumlichkeiten/Saal_2.JPG`,
      imageAlt: 'Innenansicht von Saal 2 mit Tanzfläche',
    },
    {
      id: 'r-saal-3',
      name: 'Saal 3',
      detail: 'ca. 240 m²',
      orange: true,
      imageUrl: `${MEDIA_BASE}/Raeumlichkeiten/Saal_3.JPG`,
      imageAlt: 'Innenansicht von Saal 3 mit Tanzfläche',
    },
    {
      id: 'r-foyer',
      name: 'Foyer',
      detail: 'Bar und Loungebereich',
      orange: false,
      imageUrl: `${MEDIA_BASE}/Raeumlichkeiten/Foyer.JPG`,
      imageAlt: 'Foyer mit Bar und Loungebereich',
    },
    {
      id: 'r-garderobe',
      name: 'Garderobe',
      detail: 'Umkleiden und Dusche',
      orange: true,
      imageUrl: `${MEDIA_BASE}/Raeumlichkeiten/Umkleide.JPG`,
      imageAlt: 'Umkleidebereich mit Dusche',
    },
  ];

  // ─── Lightbox fuer Raum-Fotos ─────────────────────────────────
  //
  // Reuse der bestehenden Lightbox-Komponente aus der Galerie:
  // Pfeiltasten + Swipe + Escape funktionieren automatisch. Wir
  // mappen rooms[] auf das Photo-Format das die Lightbox erwartet.

  protected readonly roomPhotos = computed<readonly Photo[]>(() =>
    this.rooms.map((r, idx) => ({
      id: idx,
      alias: r.id,
      caption: `${r.name} — ${r.detail}`,
      thumb: r.imageUrl,
      detail: r.imageUrl,
      original: r.imageUrl,
    })),
  );

  protected readonly lightboxOpen = signal(false);
  protected readonly lightboxIdx = signal(0);

  protected openRoomLightbox(idx: number): void {
    this.lightboxIdx.set(idx);
    this.lightboxOpen.set(true);
  }

  protected closeRoomLightbox(): void {
    this.lightboxOpen.set(false);
  }

}
