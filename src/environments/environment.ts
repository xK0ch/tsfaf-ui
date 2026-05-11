/**
 * Production-Defaults. Wird per fileReplacement in angular.json fuer Dev-Builds
 * gegen environment.development.ts ausgetauscht.
 */
export const environment = {
  production: true,
  /**
   * Basis-URL der cotas-api. Absolut, weil das Angular-Frontend unter
   * neu.tanzschule-family-and-friends.de laeuft und die API unter
   * anmeldung.tanzschule-family-and-friends.de (cross-origin via CORS).
   *
   * Pfad enthaelt /index.php weil IONOS-Webhosting kein mod_rewrite hat.
   * Die Routes haengen sich danach an: .../api/index.php/danceclasses etc.
   */
  cotasApiBase: 'https://anmeldung.tanzschule-family-and-friends.de/api/index.php',
  /**
   * Joomla Web Services API Base. Wird gesetzt sobald Token + Endpunkt
   * vom Kunden-Termin bestaetigt sind.
   */
  joomlaApiBase: 'https://www.tanzschule-family-and-friends.de/api/index.php/v1',
  /**
   * Joomla API Token (read-only Reader-User). Wert ist hier ein Platzhalter
   * und MUSS vor dem Production-Build lokal durch den echten Wert aus dem
   * Passwort-Manager ersetzt werden. Wird per X-Joomla-Token Header an die
   * Joomla-API mitgesendet. Token ist auf core.admin in com_content +
   * com_fields beschraenkt (Read-Only), bei Leak kein Schreibrisiko, aber
   * dennoch NICHT committen — sonst landet er fuer immer in der Git-History.
   *
   * Joomla-Kategorie-IDs (manuell gepflegt, falls sich was am Joomla-
   * Backend aendert hier auch updaten):
   *   FAQ = 9
   */
  joomlaToken: 'REPLACE_LOCALLY',
  joomlaCategoryFaq: 9,
  /**
   * Feature-Flag: "X Plaetze frei"-Anzeige pro Kursabend.
   * Falls der Kunde das nicht haben moechte: auf false setzen, Build
   * + Upload, dann verschwindet die Anzeige. Der disabled-Anmelden-Button
   * bei ausgebuchten Kursen bleibt davon unberuehrt.
   */
  showCourseSeats: true,
};
