import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { JoomlaArticle } from '../../core/models/joomla.models';
import { JoomlaApiService } from '../../core/services/joomla-api.service';

/**
 * Ein einzelner Zeitslot einer Veranstaltung. Joomla speichert die in
 * einem Textarea-Field, eine Zeile pro Slot. Wir parsen das in
 * strukturierte Slots.
 */
export interface TimeRange {
  /** Display-Form "HH:MM", z.B. "19:00". */
  readonly startLabel: string;
  /** Display-Form "HH:MM", z.B. "20:30". */
  readonly endLabel: string;
  /** Stunden als Number 0-23 (fuer Datum-Berechnung). */
  readonly startHour: number;
  readonly startMinute: number;
  readonly endHour: number;
  readonly endMinute: number;
}

export interface VeranstaltungItem {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  /** Raw-Typ-Wert aus Joomla, fuer Filter-Vergleich. */
  readonly type: string;
  /** Anzeige-Label des Typs (kann mit type identisch sein). */
  readonly typeLabel: string;
  /** Tag-CSS-Klasse, deterministisch aus type abgeleitet. */
  readonly tagClass: string;
  /** Nur Datum ohne Uhrzeit. */
  readonly date: Date;
  readonly day: number;
  readonly monthShort: string;
  readonly dateLabel: string;
  /** Schluessel fuer Monats-Gruppierung in der Liste. */
  readonly monthKey: string;
  readonly past: boolean;
  readonly timeRanges: readonly TimeRange[];
  /** Compacted summary fuer Card: "19:00 - 22:00" oder gleich, plus "(2 Bloecke)" wenn 2+. */
  readonly timeSummary: string;
  /** Volles Start-Datetime fuer ICS (Datum + erster Slot-Start). */
  readonly start: Date;
  /** Volles End-Datetime fuer ICS (Datum + letzter Slot-End, +1 Tag wenn End < Start). */
  readonly end: Date;
  readonly price: string;
  readonly priceCard: string;
  readonly requiresRegistration: boolean;
  readonly bodyHtml: string;
  readonly excerpt: string;
}

// ─── Custom-Field Value Reader ────────────────────────────────────

/**
 * Joomla liefert List-/Radio-Fields als Objekt `{key: displayText}`.
 * Text-/Textarea-/Calendar-Fields als String. Wir vereinheitlichen
 * zu `{key, display}` oder string je nach Bedarf.
 */
function readListField(value: unknown): { key: string; display: string } | null {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    return { key: value, display: value };
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return null;
    }
    const [key, display] = entries[0];
    return { key: String(key), display: String(display ?? key) };
  }
  return null;
}

function readStringField(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value == null) {
    return '';
  }
  return String(value);
}

// ─── Parsing-Helfer ───────────────────────────────────────────────

/**
 * Parst Zeitslots aus dem Textarea-Feld. Akzeptiert:
 *   "19:00 - 20:30"
 *   "19.00 - 20.30 Uhr"
 *   Mit Whitespace-Toleranz und " Uhr"-Suffix.
 * Ungueltige Zeilen werden ignoriert.
 */
export function parseTimeRanges(raw: string): readonly TimeRange[] {
  if (!raw) {
    return [];
  }
  const lines = raw.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
  const out: TimeRange[] = [];
  for (const line of lines) {
    // (HH[:.]MM) - (HH[:.]MM) optional " Uhr"
    const m = line.match(
      /^(\d{1,2})[.:](\d{2})\s*[-–—]\s*(\d{1,2})[.:](\d{2})\s*(?:Uhr)?\s*$/i,
    );
    if (!m) {
      continue;
    }
    const startHour = Number(m[1]);
    const startMinute = Number(m[2]);
    const endHour = Number(m[3]);
    const endMinute = Number(m[4]);
    if (
      startHour > 23 || startMinute > 59 ||
      endHour > 23 || endMinute > 59
    ) {
      continue;
    }
    out.push({
      startLabel: `${pad2(startHour)}:${pad2(startMinute)}`,
      endLabel: `${pad2(endHour)}:${pad2(endMinute)}`,
      startHour,
      startMinute,
      endHour,
      endMinute,
    });
  }
  return out;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function parseDate(raw: string | null | undefined): Date {
  if (!raw) {
    return new Date(0);
  }
  // Joomla liefert "YYYY-MM-DD HH:MM:SS". Wir nehmen nur den Date-Teil
  // und parsen lokal (Browser-Timezone).
  const datePart = raw.split(' ')[0];
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || !m || !d) {
    return new Date(0);
  }
  return new Date(y, m - 1, d);
}

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
 * Deterministische Tag-CSS-Klasse aus dem Typ-Schluessel, damit
 * gleiche Typen immer dieselbe Farbe bekommen.
 */
function tagClassFor(type: string): string {
  let h = 0;
  for (let i = 0; i < type.length; i++) {
    h = (Math.imul(31, h) + type.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 2 === 0 ? 'tag-primary' : 'tag-secondary';
}

function buildTimeSummary(slots: readonly TimeRange[]): string {
  if (slots.length === 0) {
    return '';
  }
  if (slots.length === 1) {
    return `${slots[0].startLabel} - ${slots[0].endLabel} Uhr`;
  }
  const first = slots[0];
  const last = slots[slots.length - 1];
  return `${first.startLabel} - ${last.endLabel} Uhr (${slots.length} Blöcke)`;
}

const DATE_LABEL: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
};

// ─── Mapper ───────────────────────────────────────────────────────

export function mapVeranstaltung(j: JoomlaArticle): VeranstaltungItem {
  const attrs = j as Record<string, unknown>;

  const typField = readListField(attrs['typ']);
  const type = typField?.key ?? 'Sonstige';
  const typeLabel = typField?.display ?? type;

  const datumRaw = readStringField(attrs['datum']);
  const date = parseDate(datumRaw);

  const zeitenRaw = readStringField(attrs['zeiten']);
  const timeRanges = parseTimeRanges(zeitenRaw);

  const voranmeldung = readListField(attrs['voranmeldung-erforderlich']);
  const requiresRegistration = voranmeldung?.key === 'Ja';

  const price = readStringField(attrs['preis']).trim();
  const priceCard = readStringField(attrs['preis-mit-kundenkarte']).trim();

  const bodyHtml = j.text ?? '';
  const metadesc = readStringField(attrs['metadesc']).trim();
  const excerpt = metadesc || truncate(stripHtml(bodyHtml), 160);

  // start + end mit Datum kombinieren (fuer ICS-Export).
  // End < Start -> end ist am Folgetag.
  const start = new Date(date);
  const end = new Date(date);
  if (timeRanges.length > 0) {
    const first = timeRanges[0];
    const last = timeRanges[timeRanges.length - 1];
    start.setHours(first.startHour, first.startMinute, 0, 0);
    end.setHours(last.endHour, last.endMinute, 0, 0);
    if (end.getTime() <= start.getTime()) {
      end.setDate(end.getDate() + 1);
    }
  }

  // "Past" prueft GANZER Tag: Event-Tag muss strikt vor heute (00:00) liegen.
  // So bleibt eine Veranstaltung den ganzen Veranstaltungstag in der Liste.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const past = date.getTime() < today.getTime();

  return {
    id: j.id,
    slug: j.alias || `event-${j.id}`,
    title: j.title,
    type,
    typeLabel,
    tagClass: tagClassFor(type),
    date,
    day: date.getDate(),
    monthShort: date.toLocaleDateString('de-DE', { month: 'short' }).replace('.', ''),
    dateLabel: date.toLocaleDateString('de-DE', DATE_LABEL),
    monthKey: date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
    past,
    timeRanges,
    timeSummary: buildTimeSummary(timeRanges),
    start,
    end,
    price,
    priceCard,
    requiresRegistration,
    bodyHtml,
    excerpt,
  };
}

// ─── Store ────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class VeranstaltungenStore {
  private readonly api = inject(JoomlaApiService);

  readonly events = toSignal<readonly VeranstaltungItem[] | null>(
    this.api
      .listArticles({
        categoryId: environment.joomlaCategoryVeranstaltungen,
        limit: 200,
      })
      .pipe(map(items => items.map(mapVeranstaltung))),
    { initialValue: null },
  );

  readonly loading = computed(() => this.events() === null);

  /**
   * Liste aller in den Daten vorkommenden Typen, deduplicated und
   * stabil sortiert (alphabetisch nach display label). Damit der
   * Filter-Bar dynamisch ist und nicht hard-coded werden muss.
   */
  readonly availableTypes = computed<readonly { key: string; label: string }[]>(() => {
    const events = this.events() ?? [];
    const seen = new Map<string, string>();
    for (const ev of events) {
      if (!seen.has(ev.type)) {
        seen.set(ev.type, ev.typeLabel);
      }
    }
    return Array.from(seen.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });
}
