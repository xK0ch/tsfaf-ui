import { Routes } from '@angular/router';

// Title und data.description jeder Route werden von SeoTitleStrategy
// (core/services/seo-title.strategy.ts) gelesen und beim Routing-Wechsel
// in <title>, meta description, Open-Graph- und Twitter-Card-Tags ueber-
// nommen (siehe core/services/seo.ts). Unterseiten haben einen kompakten
// Title ohne Markennamen-Suffix, weil der Tab- und Lesezeichen-Eintrag
// sonst redundant wird. Die Startseite traegt den vollen Markennamen.
const SITE_TITLE = 'Tanzschule Family & Friends';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/layout').then(m => m.Layout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./pages/home/home').then(m => m.Home),
        title: SITE_TITLE,
        data: {
          description:
            'Tanzschule Family & Friends in Neumünster. Standard, Latein, '
            + 'Discofox, Hip-Hop, Zumba und Veranstaltungen für Tanzpaare '
            + 'und Familien.',
        },
      },
      {
        path: 'kurse',
        loadComponent: () => import('./pages/kurse/kurse').then(m => m.Kurse),
        title: `Kurse`,
        data: {
          description:
            'Aktuelle Kurse der Tanzschule Family & Friends: Standard, '
            + 'Latein, Discofox, Hip-Hop, Zumba und mehr. Termine, Preise '
            + 'und Online-Anmeldung.',
        },
      },
      {
        path: 'kurse/anmeldung/:id',
        loadComponent: () =>
          import('./pages/kurse/anmeldung/anmeldung').then(m => m.Anmeldung),
        title: `Kursanmeldung`,
        data: {
          description:
            'Online-Anmeldung für Kurse der Tanzschule Family & Friends. '
            + 'Schnell, einfach und sicher per SEPA, Überweisung oder Bar '
            + 'bezahlen.',
        },
      },
      {
        path: 'veranstaltungen',
        loadComponent: () =>
          import('./pages/veranstaltungen/veranstaltungen').then(m => m.Veranstaltungen),
        title: `Veranstaltungen`,
        data: {
          description:
            'Tanzpartys, Workshops und Specials in der Tanzschule Family & '
            + 'Friends in Neumünster. Aktuelle Termine im Überblick.',
        },
      },
      {
        path: 'galerie',
        loadComponent: () => import('./pages/galerie/galerie').then(m => m.Galerie),
        title: `Galerie`,
        data: {
          description:
            'Bildergalerie der Tanzschule Family & Friends. Eindrücke von '
            + 'Sälen, Kursen und Veranstaltungen.',
        },
      },
      {
        path: 'galerie/:alias',
        loadComponent: () =>
          import('./pages/galerie/detail/galerie-detail').then(m => m.GalerieDetail),
        title: `Album`,
        data: {
          description:
            'Bildergalerie der Tanzschule Family & Friends in Neumünster.',
        },
      },
      {
        path: 'neuigkeiten',
        loadComponent: () =>
          import('./pages/neuigkeiten/neuigkeiten').then(m => m.Neuigkeiten),
        title: `Neuigkeiten`,
        data: {
          description:
            'Aktuelle Nachrichten aus der Tanzschule Family & Friends in '
            + 'Neumünster. Kurs-News, Events und Ankündigungen.',
        },
      },
      {
        path: 'neuigkeiten/:slug',
        loadComponent: () =>
          import('./pages/neuigkeiten/detail/neuigkeiten-detail').then(m => m.NeuigkeitenDetail),
        title: `Beitrag`,
        data: {
          description:
            'Aktueller Beitrag der Tanzschule Family & Friends in Neumünster.',
        },
      },
      {
        path: 'ueber-uns',
        loadComponent: () =>
          import('./pages/ueber-uns/ueber-uns').then(m => m.UeberUns),
        title: `Über uns`,
        data: {
          description:
            'Über die Tanzschule Family & Friends in Neumünster: Geschichte, '
            + 'Team und drei Säle mit moderner Ausstattung.',
        },
      },
      {
        path: 'kontakt',
        loadComponent: () => import('./pages/kontakt/kontakt').then(m => m.Kontakt),
        title: `Kontakt`,
        data: {
          description:
            'Kontakt zur Tanzschule Family & Friends in Neumünster: Adresse, '
            + 'Telefon, Anfahrt und Online-Kontaktformular.',
        },
      },
      {
        path: 'gutscheine',
        loadComponent: () =>
          import('./pages/gutscheine/gutscheine').then(m => m.Gutscheine),
        title: `Gutscheine`,
        data: {
          description:
            'Gutscheine der Tanzschule Family & Friends. Das passende '
            + 'Geschenk für Tanzbegeisterte.',
        },
      },
      {
        path: 'gutscheine/:id',
        loadComponent: () =>
          import('./pages/gutscheine/bestellung/bestellung').then(m => m.Bestellung),
        title: `Gutschein bestellen`,
        data: {
          description:
            'Gutschein online bestellen bei der Tanzschule Family & Friends '
            + 'in Neumünster.',
        },
      },
      {
        path: 'faq',
        loadComponent: () => import('./pages/faq/faq').then(m => m.Faq),
        title: `FAQ`,
        data: {
          description:
            'Häufige Fragen rund um Kurse, Anmeldung und Veranstaltungen '
            + 'der Tanzschule Family & Friends in Neumünster.',
        },
      },
      {
        path: 'impressum',
        loadComponent: () =>
          import('./pages/impressum/impressum').then(m => m.Impressum),
        title: `Impressum`,
        data: {
          description:
            'Impressum der Tanzschule Family & Friends in Neumünster.',
        },
      },
      {
        path: 'datenschutz',
        loadComponent: () =>
          import('./pages/datenschutz/datenschutz').then(m => m.Datenschutz),
        title: `Datenschutzerklärung`,
        data: {
          description:
            'Datenschutzerklärung der Tanzschule Family & Friends in Neumünster.',
        },
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
