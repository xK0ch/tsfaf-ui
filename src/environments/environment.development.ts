/**
 * Dev-Werte. Routen werden vom Angular-Dev-Server ueber proxy.conf.json
 * an die lokal laufenden Backends gepiped, damit kein CORS-Aerger auftritt.
 *  /cotas-api  -> http://localhost:8001/api/index.php
 *  /joomla-api -> https://www.tanzschule-family-and-friends.de
 */
export const environment = {
  production: false,
  cotasApiBase: '/cotas-api',
  joomlaApiBase: '/joomla-api/api/index.php/v1',
  /**
   * Im Dev geht der Joomla-Call durch den Angular-Dev-Proxy
   * (siehe proxy.conf.json: /joomla-api -> https://www.tanzschule-...).
   * Das umgeht CORS. Token muss trotzdem gesetzt sein, mit dem Wert
   * aus dem Passwort-Manager.
   *
   * WICHTIG: Diesen Platzhalter NICHT durch den echten Token ersetzen
   * und committen — Datei ist git-tracked. Echten Token lokal eintragen,
   * Aenderung NICHT staged, oder via `git update-index --assume-unchanged`
   * vor stage entfernen.
   */
  joomlaToken: 'REPLACE_LOCALLY',
  joomlaCategoryFaq: 9,
  joomlaCategoryNews: 8,
  joomlaCategoryTeam: 13,
  /**
   * Auch im Dev volle URL — Bilder gehen direkt an Joomla, nicht durch den
   * Dev-Proxy. CORS gilt fuer img-Tags nicht, daher kein Bedarf fuer einen
   * Proxy-Pfad.
   */
  joomlaImageBase: 'https://www.tanzschule-family-and-friends.de',
  /** Sieh environment.ts fuer die Bedeutung. */
  showCourseSeats: true,
};
