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
  /** Sieh environment.ts fuer die Bedeutung. */
  showCourseSeats: true,
};
