/**
 * Typen fuer Antworten/Anfragen der cotas-api.
 *
 * Das alte cotas-webmodule liefert PHP-Arrays als JSON. Die genauen Felder
 * pro DAO sind nicht 100% dokumentiert. Wir typisieren die uns bekannten
 * Felder explizit und lassen den Rest per Index-Signatur offen, damit die
 * Templates nicht durchfallen wenn weitere Felder ankommen.
 */

export interface DanceClass {
  id: string;
  kurskennung?: string;
  kategorie_id?: string;
  bez?: string;
  name?: string;
  beschreibung?: string;
  honorar?: string | number;
  // Weitere unbekannte Felder
  [key: string]: unknown;
}

export interface Category {
  id: string;
  bez?: string;
  priority?: number;
  dance_classes?: DanceClass[];
  [key: string]: unknown;
}

export interface TargetGroup {
  id: string;
  kennung?: string;
  name?: string;
  bez?: string;
  priority?: number;
  [key: string]: unknown;
}

export interface DanceClassesResponse {
  result?: unknown;
  [key: string]: unknown;
}

export interface DanceClassesFilteredResponse {
  result?: unknown;
  not_found?: boolean;
  [key: string]: unknown;
}

export interface DanceClassesCombinedResponse {
  categories?: Category[];
  target_group_name?: string;
  [key: string]: unknown;
}

export interface RegistrationPreviewResponse {
  dance_class?: DanceClass;
  category?: Category;
  partner?: number;
  same_bank?: number;
  debit_charge?: number;
  [key: string]: unknown;
}

/**
 * Felder im POST-Body fuer /registrations.
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
