import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

/**
 * Eingangsdaten fuer einen Meta-Tag-Update.
 *
 * Felder die undefiniert bleiben fallen auf die Site-Defaults zurueck
 * (siehe Konstanten unten).
 */
export interface SeoMeta {
  /** Browser-Tab und og:title. Default: Site-Name. */
  title?: string;
  /** meta description und og:description. Default: globale Tagline. */
  description?: string;
  /** og:image (absolute URL erwartet). Default: Logo. */
  image?: string;
  /** og:url. Default: aktueller location.href. */
  url?: string;
}

const SITE_NAME = 'Tanzschule Family & Friends';
const SITE_BASE = 'https://tanzschule-family-and-friends.de';
const DEFAULT_DESCRIPTION =
  'Tanzschule Family & Friends in Neumünster. Standard, Latein, Discofox, '
  + 'Hip-Hop, Zumba und Veranstaltungen für Tanzpaare und Familien.';
const DEFAULT_IMAGE = `${SITE_BASE}/logo.png`;

/**
 * Zentrale Stelle fuer alle SEO-relevanten <head>-Tags.
 *
 * Wird in der Regel nicht direkt aufgerufen, sondern via
 * SeoTitleStrategy (siehe seo-title.strategy.ts). Direkt benutzen
 * nur dann, wenn dynamische Inhalte (geladen via HTTP) den Title oder
 * die Beschreibung beeinflussen sollen, z.B. Album- oder News-Detail-
 * Seiten.
 */
@Injectable({ providedIn: 'root' })
export class Seo {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  /**
   * Setzt Title + meta description + Open-Graph + Twitter-Card Tags
   * und aktualisiert das canonical-Link-Element. Felder die nicht
   * gesetzt sind fallen auf Site-Defaults zurueck.
   */
  set(opts: SeoMeta = {}): void {
    const title = opts.title ?? SITE_NAME;
    const description = opts.description ?? DEFAULT_DESCRIPTION;
    const image = opts.image ?? DEFAULT_IMAGE;
    const url = opts.url ?? this.currentUrl();

    this.title.setTitle(title);

    this.meta.updateTag({ name: 'description', content: description });

    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:locale', content: 'de_DE' });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:url', content: url });

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: image });

    this.setCanonical(url);
  }

  private currentUrl(): string {
    const loc = this.document.defaultView?.location;
    return loc ? loc.href : SITE_BASE;
  }

  /**
   * <link rel="canonical"> setzt der Server nicht pro Route. Wir
   * fuegen das Element on-the-fly ein bzw. aktualisieren das href.
   * Wichtig fuer Suchmaschinen, damit www-/non-www-/Trailing-Slash-
   * Varianten zur selben URL kollabieren.
   */
  private setCanonical(url: string): void {
    let link = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}
