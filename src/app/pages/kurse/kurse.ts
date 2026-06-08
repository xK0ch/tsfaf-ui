import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { CotasApiService } from '../../core/services/cotas-api.service';
import {
  CategoryWithClasses,
  CotasDanceClass,
  CotasTargetGroup,
} from '../../core/models/cotas.models';
import { Spinner } from '../../shared/spinner/spinner';

const ALL_CATEGORIES_ID = '__all__';

/**
 * Strippt HTML und dekodiert Entities (&ouml;, &amp; etc.) korrekt.
 * Cotas X liefert info_text als HTML-Stueck mit Entities; ein simples
 * Regex-Replace wuerde die nicht aufloesen.
 */
function htmlToText(html: string): string {
  if (!html) return '';
  if (typeof document === 'undefined') {
    // Fallback ohne DOM: nur Tags strippen, Entities bleiben
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * URL-Slug aus einem Label. Lowercase, deutsche Umlaute transliteriert,
 * alles ausser a-z/0-9 wird zum Bindestrich. "Erwachsene" → "erwachsene",
 * "Kinder 3-5 Jahre" → "kinder-3-5-jahre", "Großeltern" → "grosseltern".
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Hinweistexte fuer Clubs (kzclub=1): erklaeren warum die Anmeldung
 * nicht online stattfindet und werben fuer Telefon-Kontakt /
 * Probestunde. Werden pro Kategorie-Card angezeigt.
 *
 * Diskriminierung per Zielgruppe:
 *   - Kinder       -> CLUB_INFOTEXT_KIDS (familiaerer Ton, Eltern-Ansprache)
 *   - alle anderen -> CLUB_INFOTEXT_GENERIC (kuerzer, direkt an Erwachsene)
 *
 * Frueher lagen die Texte in `config.json` (cotas-Webmodule); das wurde
 * ersetzt durch Hardcoding weil die Pflege per UUID-Liste fehleranfaellig
 * war und die Texte sich faktisch nie aendern. Wer die Texte aendern
 * will: hier umschreiben und neu deployen.
 */
const CLUB_INFOTEXT_KIDS =
  '<p><strong>Gemeinsam den richtigen Platz finden</strong></p>'
  + '<p>Für den Start in unseren Kinderclubs setzen wir auf persönlichen '
  + 'Kontakt statt auf schnelle Formulare. In einem entspannten Telefonat '
  + 'finden wir gemeinsam heraus, welche Gruppe am besten zu den '
  + 'Bedürfnissen deines Kindes passt. So schaffen wir von Anfang an '
  + 'Vertrauen und Ruhe. Kommt danach gerne vorbei und lasst euer Kind '
  + 'in einer Probestunde ganz unbeschwert ausprobieren, wie viel Freude '
  + 'das Tanzen bei uns macht.</p>';

const CLUB_INFOTEXT_GENERIC =
  '<p><strong>Lust auf eine Probestunde?</strong></p>'
  + '<p>Hier handelt es sich um einen Club, daher findet die Anmeldung '
  + 'nicht online statt. Schnapp dir einfach das Telefon und melde dich '
  + 'bei uns. So können wir direkt einen Termin für dein erstes '
  + 'Reinschnuppern vereinbaren und alle deine Fragen in Ruhe '
  + 'beantworten. Ein kurzer Anruf genügt!</p>';

@Component({
  selector: 'app-kurse',
  imports: [DecimalPipe, RouterLink, Spinner],
  templateUrl: './kurse.html',
  styleUrl: './kurse.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Kurse {
  private readonly api = inject(CotasApiService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly allCategoriesId = ALL_CATEGORIES_ID;

  protected readonly catalog = toSignal(this.api.loadCatalog(), { initialValue: null });
  protected readonly config = toSignal(this.api.loadConfig(), { initialValue: null });

  // ─── URL-Sync ────────────────────────────────────────────────────
  //
  // Aktive Auswahl von Gruppe + Kategorie wird in der URL als
  // ?gruppe=erwachsene&kategorie=discofox gespiegelt. So bleibt der
  // Tab-State beim Browser-Back vom Anmelde-Detail erhalten, und Links
  // sind teilbar/bookmarkable.
  //
  // Slug-Lookup mit Fallback auf Cotas-ID, damit alte Bookmarks mit
  // direkter ID-URL trotzdem funktionieren wenn der Chef ein Label
  // umbenennt. Wenn weder Slug noch ID matchen, fallen wir auf
  // erste-Gruppe / "Alle"-Kategorie zurueck.

  private readonly urlGroupParam = toSignal(
    this.route.queryParamMap.pipe(map(p => p.get('gruppe') ?? '')),
    { initialValue: '' },
  );
  /**
   * Komma-separierte Slug-Liste, z.B. "discofox,hip-hop". Leer/fehlend
   * == kein Filter aktiv == alle Kategorien sichtbar ("Alle"-Default).
   */
  private readonly urlCategoryParam = toSignal(
    this.route.queryParamMap.pipe(map(p => p.get('kategorie') ?? '')),
    { initialValue: '' },
  );

  protected readonly targetGroups = computed<readonly CotasTargetGroup[]>(
    () => this.catalog()?.targetGroups ?? [],
  );

  /**
   * Aktuell aktive Gruppe (id). Aus URL-Param `gruppe` resolved:
   * 1. Slug-Match auf `targetGroup.bez` (Hauptpfad)
   * 2. Fallback ID-Match (alte Bookmarks)
   * 3. Fallback erste Gruppe
   */
  protected readonly currentGroupId = computed<string | null>(() => {
    const groups = this.targetGroups();
    if (groups.length === 0) return null;
    const param = this.urlGroupParam();
    if (param) {
      const bySlug = groups.find(g => slugify(g.bez) === param);
      if (bySlug) return bySlug.id;
      const byId = groups.find(g => g.id === param);
      if (byId) return byId.id;
    }
    return groups[0].id;
  });

  /**
   * Anzahl der Termine pro Zielgruppe (fuer die Tabs-Counter). Termine,
   * nicht Kategorien, weil die Tab-Counter dem User die Erwartung "Anzahl
   * an Auswahlmoeglichkeiten" geben.
   */
  protected readonly groupCounts = computed<Readonly<Record<string, number>>>(() => {
    const cat = this.catalog();
    const out: Record<string, number> = {};
    if (!cat) return out;
    for (const tg of cat.targetGroups) {
      out[tg.id] = cat.classesByGroup.get(tg.id)?.length ?? 0;
    }
    return out;
  });

  protected readonly categories = computed<readonly CategoryWithClasses[]>(() => {
    const cat = this.catalog();
    const gid = this.currentGroupId();
    if (!cat || !gid) return [];
    return cat.categoriesByGroup.get(gid) ?? [];
  });

  /**
   * Aktuell aktive Kategorie-IDs als Set. Resolved aus dem komma-Slug-
   * Param: pro Token erst Slug-Match, dann ID-Match. Tokens die weder
   * matchen werden ignoriert (URL bleibt aber stehen).
   */
  protected readonly activeCategoryIds = computed<ReadonlySet<string>>(() => {
    const raw = this.urlCategoryParam();
    if (!raw) return new Set<string>();
    const cats = this.categories();
    if (cats.length === 0) return new Set<string>();
    const tokens = raw.split(',').map(s => s.trim()).filter(Boolean);
    const out = new Set<string>();
    for (const tok of tokens) {
      const bySlug = cats.find(c => slugify(c.bez) === tok);
      if (bySlug) {
        out.add(bySlug.id);
        continue;
      }
      const byId = cats.find(c => c.id === tok);
      if (byId) out.add(byId.id);
    }
    return out;
  });

  /**
   * Sichtbare Kategorien-Karten. Wenn Set leer (= "Alle"): alle. Sonst
   * nur die ausgewaehlten. Reihenfolge bleibt wie in der API.
   */
  protected readonly filteredCategories = computed<readonly CategoryWithClasses[]>(() => {
    const cats = this.categories();
    const active = this.activeCategoryIds();
    if (active.size === 0) return cats;
    return cats.filter(c => active.has(c.id));
  });

  protected readonly filteredCategoryCount = computed(() => this.filteredCategories().length);

  protected readonly filteredTermineCount = computed(() => {
    let n = 0;
    for (const c of this.filteredCategories()) n += c.classes.length;
    return n;
  });

  /** Wahr wenn alle Kategorien gezeigt werden (= keine Filter aktiv). */
  protected readonly allCategoriesActive = computed(() => this.activeCategoryIds().size === 0);

  /**
   * Komma-separiertes Display-Label aller aktiven Kategorien, z.B.
   * "Discofox" oder "Discofox, Hip Hop". Leer wenn keine Auswahl.
   */
  protected readonly activeCategoryLabel = computed<string>(() => {
    const active = this.activeCategoryIds();
    if (active.size === 0) return '';
    return this.categories()
      .filter(c => active.has(c.id))
      .map(c => c.bez)
      .join(', ');
  });

  // ----- Aktionen -----

  /**
   * Tab-Wechsel: setzt `gruppe` als Slug in der URL und entfernt das
   * `kategorie`-Param (damit der "Alle"-Default greift, sonst koennte ein
   * Kategorie-Slug stehen bleiben der in der neuen Gruppe nicht existiert).
   * replaceUrl=true, damit jedes Filter-Klicken keinen History-Eintrag
   * generiert.
   */
  protected selectGroup(id: string): void {
    const group = this.targetGroups().find(g => g.id === id);
    const slug = group ? slugify(group.bez) : id;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { gruppe: slug, kategorie: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /**
   * Toggle einer Kategorie: ist sie schon aktiv -> raus, sonst dazu.
   * Resultierende Slug-Liste landet als komma-separierter Wert in der URL.
   * Leerer Set -> Param wird entfernt (= "Alle" wieder aktiv).
   */
  protected toggleCategory(id: string): void {
    const cats = this.categories();
    const cat = cats.find(c => c.id === id);
    if (!cat) return;
    const slug = slugify(cat.bez);

    // Konstruiere die neue Slug-Liste aus den AKTUELLEN aktiven Slugs +
    // Toggle. Aktive Slugs ableiten wir aus activeCategoryIds (id -> slug).
    const activeIds = new Set(this.activeCategoryIds());
    const nextSlugs = new Set<string>();
    for (const c of cats) {
      if (activeIds.has(c.id) && c.id !== id) {
        nextSlugs.add(slugify(c.bez));
      }
    }
    if (!activeIds.has(id)) {
      nextSlugs.add(slug);
    }
    this.navigateCategories(nextSlugs);
  }

  /** Setzt alle Kategorie-Filter zurueck (= "Alle"-Chip-Klick). */
  protected resetCategory(): void {
    this.navigateCategories(new Set());
  }

  private navigateCategories(slugs: ReadonlySet<string>): void {
    // Alphabetisch sortiert damit die URL deterministisch ist (gleicher
    // Filter-Stand == identische URL, egal in welcher Reihenfolge geklickt).
    const value = slugs.size === 0 ? null : Array.from(slugs).sort().join(',');
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { kategorie: value },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  // ----- Display-Helpers -----

  protected isFull(c: CotasDanceClass): boolean {
    const f = c.full;
    return f === true || f === 1 || f === '1';
  }

  /**
   * Online-Anmeldung ist fuer alle Tanz-Clubs (kzclub=1) geblockt.
   * Diese Kurse werden ueber Probestunde / Telefon / Direktkontakt
   * gebucht, nicht ueber das Anmelde-Formular. Frueher gab es dafuer
   * eine explizite Kategorie-UUID-Liste in der Cotas-config.json
   * (`no_online_registration`); Auswertung der echten Daten hat
   * gezeigt, dass die Liste 1:1 alle Clubs enthielt. Wir leiten das
   * jetzt direkt aus dem kzclub-Flag ab und sparen uns die Pflege.
   *
   * Falls einzelne Clubs spaeter doch online-anmeldbar sein sollen,
   * waere hier eine Whitelist die richtige Stelle (z.B. via Config).
   */
  protected isOnlineRegistrationBlocked(c: CotasDanceClass): boolean {
    return this.isAbo(c);
  }

  /**
   * Hinweistext fuer Club-Kategorien. Nimmt einen repraesentativen
   * Kurs der Kategorie und entscheidet anhand von kzclub +
   * zielgruppen_bez welcher Text gerendert wird. Nicht-Clubs bekommen
   * keinen Text. Texte siehe Konstanten oben in dieser Datei.
   */
  protected infotextForCategory(cat: CategoryWithClasses): SafeHtml | null {
    const sample = cat.classes[0];
    if (!sample || !this.isAbo(sample)) return null;
    const html = sample.zielgruppen_bez === 'Kinder'
      ? CLUB_INFOTEXT_KIDS
      : CLUB_INFOTEXT_GENERIC;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  protected phoneNumber(): string {
    return this.config()?.phone ?? '04321 1 49 00';
  }

  protected phoneHref(): string {
    return 'tel:+49' + this.phoneNumber().replace(/[^\d]/g, '').replace(/^0/, '');
  }

  protected startTime(c: CotasDanceClass): string {
    if (c.tmpl_start) return c.tmpl_start;
    return (c.start ?? '').slice(0, 5);
  }

  protected endTime(c: CotasDanceClass): string {
    return (c.ende ?? '').slice(0, 5);
  }

  /**
   * Abo (Tanz-Club) in Cotas: das Feld `kzclub` ist '1' bzw. 1. Diese
   * Kurse laufen kontinuierlich — das Startdatum ist meist Jahre alt
   * und verwirrt Interessenten ("ist der Kurs noch aktuell?"). Wir
   * zeigen fuer Abos deshalb nur den Wochentag, fuer normale Kurse
   * wie bisher Wochentag plus Anfangsdatum.
   *
   * Default bei fehlendem oder unbekanntem Wert: kein Abo (= Datum
   * anzeigen). Belt-and-suspenders auch fuer den Fall, dass Cotas das
   * Feld irgendwann anders liefert.
   */
  protected isAbo(c: CotasDanceClass): boolean {
    return (
      c.kzclub === '1'
      || (typeof c.kzclub === 'number' && c.kzclub === 1)
    );
  }

  /**
   * Anzeige des Termins: bei Kursen "Dienstag, 13.08.2026", bei Abos
   * nur "Dienstag". Faengt zusaetzlich den Fall ab, dass das Anfangs-
   * datum in Cotas leer gelassen wurde.
   */
  protected dayAndStart(c: CotasDanceClass): string {
    if (this.isAbo(c)) return c.tag;
    const date = (c.tmpl_kurs_beginn ?? '').trim();
    return date ? `${c.tag}, ${date}` : c.tag;
  }

  protected duration(c: CotasDanceClass): number {
    const parse = (s: string): number | null => {
      const [h, m] = (s ?? '').split(':').map(n => parseInt(n, 10));
      if (Number.isNaN(h) || Number.isNaN(m)) return null;
      return h * 60 + m;
    };
    const a = parse(c.start);
    const b = parse(c.ende);
    if (a == null || b == null) return 0;
    return Math.max(0, b - a);
  }

  protected priceNumber(c: CotasDanceClass): number {
    const n = parseFloat(c.honorar);
    return Number.isFinite(n) ? n : 0;
  }

  protected weeksLabel(c: CotasDanceClass): string {
    const u = parseInt(c.einheiten, 10);
    if (Number.isFinite(u) && u > 0) return `${u} Wochen`;
    return '';
  }

  /**
   * Beschreibung pro Kategorie. Nimmt info_text vom ersten Termin
   * (innerhalb einer Kategorie ist das textuell identisch) und strippt
   * das HTML. Voller Text — die Beschreibungen sind bewusst lang
   * angelegt, damit der Interessent alle Infos sofort sieht.
   */
  protected descriptionFor(cat: CategoryWithClasses): string {
    const first = cat.classes[0];
    if (!first) return '';
    return htmlToText(first.info_text ?? '');
  }

  /** Wenn alle Termine der Kategorie ausgebucht sind. */
  protected categoryFull(cat: CategoryWithClasses): boolean {
    if (cat.classes.length === 0) return false;
    return cat.classes.every(t => this.isFull(t));
  }
}
