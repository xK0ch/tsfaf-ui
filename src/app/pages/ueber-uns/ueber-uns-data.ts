import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { JoomlaArticle } from '../../core/models/joomla.models';
import { JoomlaApiService } from '../../core/services/joomla-api.service';

/**
 * Ein Team-Mitglied im flachen Frontend-Modell.
 *
 * Der Chef pflegt pro Person einen Joomla-Article in der Kategorie "Team":
 *   - Titel  -> name
 *   - Intro-Bild + Alt-Text -> imageUrl + imageAlt
 *   - Body (Bullet-Liste, eine Rolle pro Punkt) -> [role, ...qualifications]
 *   - Joomla-Ordering -> Reihenfolge im Frontend
 *
 * `role` ist der erste Bullet (gross dargestellt unter dem Namen),
 * `qualifications` sind die restlichen Bullets (kleine Tag-Pillen).
 */
export interface TeamMember {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly qualifications: readonly string[];
  readonly imageUrl: string | null;
  readonly imageAlt: string;
}

// ─── Mapping-Helfer ───────────────────────────────────────────────

/**
 * Joomla packt an Bild-Pfade Metadaten an
 *   "images/team/uwe.jpg#joomlaImage://local-images/team/uwe.jpg?w=400"
 * Wir nehmen nur den File-Pfad und machen ihn absolut.
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

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Extrahiert Rollen aus dem Joomla-Body-HTML.
 *
 * Bevorzugt wird `<li>` (Bullet-Liste). Falls keine Liste eingegeben
 * wurde, faellt's auf `<p>`-Absaetze zurueck, dann auf Zeilen-getrennten
 * Plain-Text. So toleriert das Mapping verschiedene Editor-Verhalten.
 */
export function extractRoles(html: string): readonly string[] {
  const liMatches = Array.from(html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi));
  if (liMatches.length > 0) {
    return liMatches.map(m => stripTags(m[1])).filter(s => s.length > 0);
  }
  const pMatches = Array.from(html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi));
  if (pMatches.length > 0) {
    return pMatches.map(m => stripTags(m[1])).filter(s => s.length > 0);
  }
  // Plain-Text Fallback: erst NACH den Zeilen splitten, sonst frisst
  // stripTags die Newlines.
  return html
    .split(/\n+/)
    .map(line => stripTags(line))
    .filter(s => s.length > 0);
}

export function mapTeamMember(j: JoomlaArticle): TeamMember {
  const roles = extractRoles(j.text ?? '');
  const imageUrl = resolveJoomlaImage(j.images?.image_intro);
  const imageAltRaw = (j.images?.image_intro_alt ?? '').trim();
  const imageAlt = imageAltRaw || `Foto von ${j.title}`;
  return {
    id: j.id,
    name: j.title,
    role: roles[0] ?? '',
    qualifications: roles.slice(1),
    imageUrl,
    imageAlt,
  };
}

// ─── Store ────────────────────────────────────────────────────────

/**
 * Lazy-Loading-Store. Erst beim ersten Inject wird der GET ausgefuehrt;
 * danach teilt sich die Ueber-uns-Page (und potenziell zukuenftige
 * Konsumenten) denselben Signal-Stand.
 */
@Injectable({ providedIn: 'root' })
export class TeamStore {
  private readonly api = inject(JoomlaApiService);

  readonly members = toSignal<readonly TeamMember[] | null>(
    this.api
      .listArticles({
        categoryId: environment.joomlaCategoryTeam,
        limit: 100,
        // Reihenfolge im Frontend folgt dem Joomla-Ordering-Feld, das
        // der Chef in der Beitragsliste per Drag&Drop pflegt. Joomla
        // liefert das Feld nicht in der Response zurueck, also muessen
        // wir SERVER-seitig sortieren — Client-Sort waere wirkungslos.
        orderBy: 'ordering',
        orderDirection: 'asc',
      })
      .pipe(map(items => items.map(mapTeamMember))),
    { initialValue: null },
  );

  readonly loading = computed(() => this.members() === null);
}
