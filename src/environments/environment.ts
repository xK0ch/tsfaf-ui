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
};
