import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withHashLocation, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch()),
    provideRouter(
      routes,
      // Hash-Routing weil das IONOS-Webhosting mod_rewrite nicht zuverlaessig
      // unterstuetzt. URLs sehen dann aus wie /#/kurse statt /kurse.
      // Wenn der Hoster spaeter mal mod_rewrite zulaesst, einfach diese Zeile
      // entfernen und Build neu hochladen.
      withHashLocation(),
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
    ),
  ],
};
