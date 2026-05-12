import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { JoomlaArticle } from '../../core/models/joomla.models';
import { JoomlaApiService } from '../../core/services/joomla-api.service';

/**
 * Flach gemapptes News-Modell fuer die UI. Wird aus dem rohen
 * JoomlaArticle gebaut.
 *
 * Datum-Strings sind in 'de-DE' lokalisiert vorgerechnet, damit der
 * Template-Code keinen DatePipe braucht und keine Timezone-Tricks tun
 * muss (Joomla liefert die Created-/Publish_up-Strings ohne Zone, wir
 * interpretieren sie als UTC; das passt fuer unsere reine Datumsausgabe).
 */
export interface NewsArticle {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly date: Date;
  readonly dateLong: string;
  readonly dateShort: string;
  readonly excerpt: string;
  readonly bodyHtml: string;
  /** Absolute URL des Intro-Bilds, null wenn kein Bild gepflegt. */
  readonly imageUrl: string | null;
  /** Alt-Text aus Joomla; faellt auf Title zurueck wenn leer. */
  readonly imageAlt: string;
  /** Bildunterschrift; null wenn nicht gepflegt. */
  readonly imageCaption: string | null;
}

// ─── Mapping-Helfer ────────────────────────────────────────────────

/**
 * Joomla packt an die Bild-Pfade Metadaten an: z.B.
 *   "images/blog_bilder/foo.jpg#joomlaImage://local-images/foo.jpg?w=1200"
 * Wir wollen nur den File-Pfad. Optional macht's noch absolute URL.
 */
function resolveJoomlaImage(raw: string | undefined): string | null {
  if (!raw) {
    return null;
  }
  const path = raw.split('#')[0].trim();
  if (!path) {
    return null;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const base = environment.joomlaImageBase.replace(/\/+$/, '');
  return `${base}/${path.replace(/^\/+/, '')}`;
}

/**
 * Tags aus einem HTML-Snippet rausschneiden um daraus einen
 * Plaintext-Teaser zu bauen. Reicht fuer Joomla-Artikel die unser Editor
 * produziert (keine Scripts, kein Encoded-Content); wir nutzen das
 * Ergebnis NICHT fuer innerHTML-Rendering, also kein XSS-Risiko.
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut) + '…';
}

/**
 * Pickt das Excerpt entweder aus dem Joomla-metadesc (sauber gepflegt
 * vom Editor) oder reisst aus dem Body die ersten ~160 Zeichen plain.
 */
function buildExcerpt(j: JoomlaArticle): string {
  const metadesc = String((j as Record<string, unknown>)['metadesc'] ?? '').trim();
  if (metadesc) {
    return metadesc;
  }
  return truncate(stripHtml(j.text ?? ''), 160);
}

const DATE_LONG: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
};

const DATE_SHORT: Intl.DateTimeFormatOptions = {
  month: 'short',
  year: '2-digit',
};

function parseDate(value: string | null | undefined): Date {
  if (!value) {
    return new Date(0);
  }
  // Joomla liefert "YYYY-MM-DD HH:MM:SS" ohne Zone -> Browser-lokale
  // Interpretation. Fuer reine Datumsausgabe ohne Uhrzeit reicht das.
  const d = new Date(value.replace(' ', 'T'));
  return isNaN(d.getTime()) ? new Date(0) : d;
}

export function mapNewsArticle(j: JoomlaArticle): NewsArticle {
  // publish_up hat Vorrang (wenn der Chef einen Artikel auf ein bestimmtes
  // Datum vorbereitet), sonst der Erstelltzeitpunkt.
  const date = parseDate(j.publish_up ?? j.created);
  const imageUrl = resolveJoomlaImage(j.images?.image_intro);
  const imageAlt = (j.images?.image_intro_alt ?? '').trim() || j.title;
  const captionRaw = (j.images?.image_intro_caption ?? '').trim();
  return {
    id: j.id,
    slug: j.alias || `news-${j.id}`,
    title: j.title,
    date,
    dateLong: date.toLocaleDateString('de-DE', DATE_LONG),
    dateShort: date.toLocaleDateString('de-DE', DATE_SHORT),
    excerpt: buildExcerpt(j),
    bodyHtml: j.text ?? '',
    imageUrl,
    imageAlt,
    imageCaption: captionRaw || null,
  };
}

// ─── Store ────────────────────────────────────────────────────────

export const NEWS_PER_PAGE = 6;

/**
 * Lazy-Loading Store. Erst beim ersten Inject wird der GET ausgefuehrt;
 * danach teilen sich List-Page, Detail-Page und Sidebar denselben
 * Signal-Stand, also keine redundanten HTTP-Calls.
 *
 * Signals:
 *   articles()  null = noch nicht geladen, Array sonst (auch leer)
 *   loading()   true solange null
 */
@Injectable({ providedIn: 'root' })
export class NewsStore {
  private readonly api = inject(JoomlaApiService);

  readonly articles = toSignal<readonly NewsArticle[] | null>(
    this.api
      .listArticles({
        categoryId: environment.joomlaCategoryNews,
        limit: 200,
      })
      .pipe(
        map(items =>
          items
            .map(mapNewsArticle)
            .sort((a, b) => b.date.getTime() - a.date.getTime()),
        ),
      ),
    { initialValue: null },
  );

  readonly loading = computed(() => this.articles() === null);

  /** Liefert null wenn entweder noch geladen wird oder Slug nicht existiert. */
  bySlug(slug: string): NewsArticle | null {
    const all = this.articles();
    if (!all) {
      return null;
    }
    return all.find(a => a.slug === slug) ?? null;
  }
}
