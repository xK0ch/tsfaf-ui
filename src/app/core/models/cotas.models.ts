/**
 * Typen fuer Antworten/Anfragen der cotas-api.
 *
 * Das alte cotas-webmodule liefert PHP-Arrays als JSON. Die genauen Felder
 * sind in den DAOs definiert. Wir typisieren die uns bekannten Felder
 * explizit (gewonnen via curl gegen /api/index.php/danceclasses), und
 * lassen den Rest per Index-Signatur offen, damit die Templates
 * forwards-kompatibel bleiben.
 */

export interface CotasTargetGroup {
  id: string;
  name: string;
  bez: string;
  beschreibung: string;
  priority: number;
  active: string; // "active" oder leer
  [key: string]: unknown;
}

export interface CotasCategory {
  id: string;
  bez: string;
  name?: string;
  beschreibung?: string;
  priority?: number;
  [key: string]: unknown;
}

/**
 * Eine Tanzklasse (ein konkreter Kurs).
 * Felder wie in /api/index.php/danceclasses verifiziert.
 */
export interface CotasDanceClass {
  id: string;
  kurskennung: string;       // UUID, fuer Registrierung
  kurs_bez: string;          // Anzeigename (z.B. "Welttanzprogramm 1 Erwachsene")
  kurs_nr: string;
  saison: string;
  jahr: string;
  standort: string;
  saal_bez: string;
  kzclub: string;

  // Zielgruppe
  zielgruppen_id: string;
  zielgruppen_bez: string;
  zielgruppen_priority: string;

  // Kategorie
  kategorie_id: string;
  kategorie_bez: string;
  kategorie_priority: string;

  // Termine / Zeitplan
  tag: string;               // Wochentag, "Montag"
  kurs_beginn: string;       // ISO-Date "2026-05-11"
  tmpl_kurs_beginn: string;  // formatiert "11.05.2026"
  start: string;             // "20:30:00"
  ende: string;              // "22:15:00"
  tmpl_start: string;        // "20:30"
  einheiten: string;         // Anzahl Termine
  terminrhythmus: string;
  next_date: string | null;

  // Preis / Inhalt
  honorar: string;           // "0.00" oder Preis als Decimal-String
  umsatzsteuerfrei: string;
  kursleiter: string;
  assistent: string;
  info_text: string;         // HTML-Beschreibung
  headline: string;

  // Flags
  full: boolean | number | string | null;
  started: number;
  finished: number;
  show_next: number;
  schnupperkurs: string;     // "0" oder "1"

  // Optionen (1-15, je mit _bez Label)
  // Wir behandeln sie generisch via Index-Signatur unten.

  // Vertraege (nullable, wird vom Detail-Endpoint befuellt)
  contracts: unknown;

  type: string;              // "kurs"

  [key: string]: unknown;
}

/**
 * Top-Level-Antwort von GET /danceclasses (ungefiltert).
 */
export interface CotasDanceClassesResponse {
  target_groups: CotasTargetGroup[];
  categories?: CotasCategory[];
  dance_classes: Record<string, CotasDanceClass[][]>;
  [key: string]: unknown;
}

/**
 * Antwort von GET /danceclasses?kategorie=X&zielgruppe=Y (gefiltert).
 * Struktur ist enger, wird vom alten Service als "result" Hash geliefert.
 */
export interface CotasDanceClassesFilteredResponse {
  result?: unknown;
  not_found?: boolean;
  [key: string]: unknown;
}

/**
 * Normalisierte Form, die im Frontend praktisch ist. Wird von
 * CotasApiService.loadCatalog() aus der Roh-Antwort gebaut.
 */
export interface DanceClassCatalog {
  /** Sortiert nach priority ASC */
  targetGroups: CotasTargetGroup[];
  /** zielgruppen_id -> flache, kategorie-priorisierte Klassenliste */
  classesByGroup: ReadonlyMap<string, readonly CotasDanceClass[]>;
  /** zielgruppen_id -> Kategorien fuer dieses Tab (nur die mit Klassen) */
  categoriesByGroup: ReadonlyMap<string, readonly CategoryWithClasses[]>;
}

export interface CategoryWithClasses {
  id: string;
  bez: string;
  priority: number;
  classes: readonly CotasDanceClass[];
}

// ----- Registrierung -----

export interface RegistrationPreviewResponse {
  dance_class?: CotasDanceClass;
  category?: CotasCategory;
  partner?: number;
  same_bank?: number;
  debit_charge?: number;
  [key: string]: unknown;
}

/**
 * POST-Body fuer /registrations.
 * Pflichtfelder gemaess get_mandatory_fields() im alten Service.
 */
export interface RegistrationSubmitPayload {
  id: string;
  kurskennung: string;
  vertrag_id: string;
  session?: string;
  partner?: 0 | 1;
  debit_charge?: 0 | 1;
  checked?: 0 | 1;
  anrede: number;
  vorname: string;
  nachname: string;
  strasse: string;
  hausnummer: string;
  plz: string;
  stadt: string;
  email: string;
  telefon: string;
  geburtstag: string;
  iban?: string;
  bic?: string;
  inhaber?: string;
  bemerkung?: string;

  // Partner-Felder (nur befuellen wenn partner === 1)
  p_anrede?: number;
  p_vorname?: string;
  p_nachname?: string;
  p_strasse?: string;
  p_hausnummer?: string;
  p_plz?: string;
  p_stadt?: string;
  p_email?: string;
  p_telefon?: string;
  p_geburtstag?: string;
  p_iban?: string;
  p_bic?: string;
  p_inhaber?: string;
  p_lastschrift?: 0 | 1;
}

export interface RegistrationSubmitResponse {
  id?: string;
  /** false bei Erfolg, true/1 bei Validierungsfehlern */
  errors?: boolean | number;
  err_mail?: number;
  /** Fuer jedes invalide Feld kommt ein 'err_<feld>': 1 zurueck */
  [key: string]: unknown;
}

export interface ConfirmRegistrationResponse {
  ok?: number;
  not_found?: number;
  already_confirmed?: number;
  err_mail?: number;
  [key: string]: unknown;
}

// ----- Vouchers (vorerst lose typisiert) -----

export interface VoucherResponse {
  voucher_id?: string;
  voucher?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface VoucherOrderPayload {
  voucher_id: string;
  betrag: string;
  vorname: string;
  nachname: string;
  email: string;
  session?: string;
  [key: string]: unknown;
}

export interface VoucherOrderResponse {
  ok?: number;
  session?: string;
  errors?: boolean;
  err_mail?: number;
  [key: string]: unknown;
}
