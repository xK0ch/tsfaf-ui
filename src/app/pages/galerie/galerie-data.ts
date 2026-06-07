import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import {
  GalleryApiService,
  type RawAlbum,
  type RawImage,
} from '../../core/services/gallery-api.service';

// ─── Frontend-Typen ───────────────────────────────────────────────

export interface Album {
  readonly id: number;
  readonly alias: string;
  readonly title: string;
  readonly description: string;
  readonly date: Date;
  /** "5. Mai 2026" */
  readonly dateLong: string;
  /** "Mai 2026" */
  readonly dateShort: string;
  readonly imageCount: number;
  /**
   * Cover-URL fuer die Album-Karte in der Listen-Page. Wir nehmen
   * absichtlich die `detail`-Groesse (~600px) statt `thumb` (~200px) —
   * Thumbs sehen auf Retina-Displays unscharf aus.
   */
  readonly coverUrl: string | null;
}

export interface Photo {
  readonly id: number;
  readonly alias: string;
  /** Anzeigetext (Title oder Description), Fallback "Bild <id>". */
  readonly caption: string;
  /** Thumbnail (klein, fuer das Grid). */
  readonly thumb: string;
  /** Mittelgrosses Bild (fuer Preview). */
  readonly detail: string;
  /** Originalgrosses Bild (Lightbox). */
  readonly original: string;
}

// ─── Mapper ───────────────────────────────────────────────────────

function parseDate(raw: string | null | undefined): Date {
  if (!raw) {
    return new Date(0);
  }
  // PHP liefert "YYYY-MM-DD HH:MM:SS" — wir parsen lokal.
  const d = new Date(raw.replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

const DATE_LONG_FMT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
};

const DATE_SHORT_FMT: Intl.DateTimeFormatOptions = {
  month: 'long',
  year: 'numeric',
};

export function mapAlbum(raw: RawAlbum): Album {
  const date = parseDate(raw.date);
  return {
    id: raw.id,
    alias: raw.alias,
    title: raw.title,
    description: raw.description ?? '',
    date,
    dateLong: date.toLocaleDateString('de-DE', DATE_LONG_FMT),
    dateShort: date.toLocaleDateString('de-DE', DATE_SHORT_FMT),
    imageCount: raw.imageCount,
    // Detail bevorzugt fuer scharfe Anzeige; thumb als Fallback fuer
    // den Fall dass die alte API-Version (vor dem detail-Feld) noch lebt.
    coverUrl: raw.cover?.detail ?? raw.cover?.thumb ?? null,
  };
}

export function mapPhoto(raw: RawImage): Photo {
  const caption = (raw.title || '').trim() || (raw.description || '').trim() || `Bild ${raw.id}`;
  return {
    id: raw.id,
    alias: raw.alias,
    caption,
    thumb: raw.thumb,
    detail: raw.detail,
    original: raw.original,
  };
}

// ─── Konstanten ───────────────────────────────────────────────────

export const ALBUMS_PER_PAGE = 24;

// ─── Store ────────────────────────────────────────────────────────

/**
 * Lazy-Loading Store fuer die Alben-Liste. Erst beim ersten Inject
 * wird der ?albums-Call ausgefuehrt; danach teilen sich Listen-Page
 * und Detail-Page denselben Signal-Stand. Bild-Details pro Album
 * laedt die Detail-Komponente direkt — die holen wir nicht in den
 * Store weil pro Album-Switch ein neuer Call faellig ist.
 */
@Injectable({ providedIn: 'root' })
export class GalleryStore {
  private readonly api = inject(GalleryApiService);

  readonly albums = toSignal<readonly Album[] | null>(
    this.api.listAlbums().pipe(map(items => items.map(mapAlbum))),
    { initialValue: null },
  );

  readonly loading = computed(() => this.albums() === null);

  byAlias(alias: string): Album | null {
    return this.albums()?.find(a => a.alias === alias) ?? null;
  }
}
