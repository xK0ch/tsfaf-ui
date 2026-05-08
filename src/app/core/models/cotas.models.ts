/**
 * Typen fuer Antworten/Anfragen der cotas-api.
 *
 * Felder verifiziert via curl gegen /api/index.php/danceclasses und
 * /api/index.php/registrations/preview. Unbekannte Zusatzfelder bleiben
 * via Index-Signatur offen.
 */

export interface CotasTargetGroup {
  id: string;
  name: string;
  bez: string;
  beschreibung: string;
  priority: number;
  active: string;
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
 */
export interface CotasDanceClass {
  id: string;
  kurskennung: string;
  kurs_bez: string;
  kurs_nr: string;
  saison: string;
  jahr: string;
  standort: string;
  saal_bez: string;
  kzclub: string;

  zielgruppen_id: string;
  zielgruppen_bez: string;
  zielgruppen_priority: string;

  kategorie_id: string;
  kategorie_bez: string;
  kategorie_priority: string;

  tag: string;
  kurs_beginn: string;
  tmpl_kurs_beginn: string;
  start: string;
  ende: string;
  tmpl_start: string;
  einheiten: string;
  terminrhythmus: string;
  next_date: string | null;

  honorar: string;
  umsatzsteuerfrei: string;
  kursleiter: string;
  assistent: string;
  info_text: string;
  headline: string;

  full: boolean | number | string | null;
  started: number;
  finished: number;
  show_next: number;
  schnupperkurs: string;

  contracts: unknown;

  type: string;

  [key: string]: unknown;
}

/**
 * Vertragsoption (Tarif) fuer einen Kurs. Tabelle dc_vertraege.
 */
export interface CotasContract {
  id: string;
  kurskennung: string;
  bezeichnung: string;
  /** Decimal als String, z.B. "106.00" */
  zahlbetrag: string;
  endetohnekuendigung?: string;
  lastschrift?: string;
  ueberweisung?: string;
  [key: string]: unknown;
}

export interface CotasDanceClassesResponse {
  target_groups: CotasTargetGroup[];
  categories?: CotasCategory[];
  dance_classes: Record<string, CotasDanceClass[][]>;
  [key: string]: unknown;
}

export interface CotasDanceClassesFilteredResponse {
  result?: unknown;
  not_found?: boolean;
  [key: string]: unknown;
}

export interface DanceClassCatalog {
  targetGroups: CotasTargetGroup[];
  classesByGroup: ReadonlyMap<string, readonly CotasDanceClass[]>;
  categoriesByGroup: ReadonlyMap<string, readonly CategoryWithClasses[]>;
}

export interface CategoryWithClasses {
  id: string;
  bez: string;
  priority: number;
  classes: readonly CotasDanceClass[];
}

// ----- Site-Config (vom /config Endpoint) -----

export interface CotasInfoText {
  category_ids: readonly string[];
  /** HTML-Body des Hinweistextes */
  body: string;
}

export interface CotasSiteConfig {
  /** Kategorie-UUIDs fuer die KEINE Online-Anmeldung moeglich ist. */
  no_online_registration: readonly string[];
  /** Hinweistexte (HTML), die fuer bestimmte Kategorien angezeigt werden. */
  infotexts: readonly CotasInfoText[];
  /** Kategorien in denen der Partner-Toggle ausgeblendet wird. */
  enforce_no_partner_categories: readonly string[];
  /** Zielgruppen die nur mit Partner buchbar sind. */
  enforce_partner_target_groups: readonly string[];
  /** Kontakt-Telefonnummer fuer Telefon-CTA. */
  phone: string;
}

// ----- Registrierung -----

export interface RegistrationPreviewResponse {
  dance_class?: CotasDanceClass;
  category?: CotasCategory;
  partner?: number;
  same_bank?: number;
  debit_charge?: number;
  /** Tarif-Optionen, in der API-Erweiterung mitgeliefert. */
  contracts?: CotasContract[];
  [key: string]: unknown;
}

export interface RegistrationSubmitPayload {
  id: string;
  kurskennung: string;
  vertrag_id: string;
  session?: string;
  partner: 0 | 1 | 2;
  debit_charge?: 0 | 1;
  checked: 0 | 1;
  anrede: number;
  vorname: string;
  nachname: string;
  strasse: string;
  hausnummer: string;
  plz: string;
  stadt: string;
  email: string;
  telefon: string;
  /** Format dd.mm.yyyy */
  geburtstag: string;
  iban?: string;
  bic?: string;
  inhaber?: string;
  bemerkung?: string;

  // Partner-Felder, nur befuellen wenn partner === 1
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
  errors?: boolean | number;
  err_mail?: number;
  [key: string]: unknown;
}

export interface ConfirmRegistrationResponse {
  ok?: number;
  not_found?: number;
  already_confirmed?: number;
  err_mail?: number;
  [key: string]: unknown;
}

// ----- Vouchers -----

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
