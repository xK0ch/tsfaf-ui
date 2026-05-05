import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/layout').then(m => m.Layout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./pages/home/home').then(m => m.Home),
        title: 'Tanzschule Family & Friends',
      },
      {
        path: 'kurse',
        loadComponent: () => import('./pages/kurse/kurse').then(m => m.Kurse),
        title: 'Kurse — Tanzschule Family & Friends',
      },
      {
        path: 'veranstaltungen',
        loadComponent: () => import('./pages/veranstaltungen/veranstaltungen').then(m => m.Veranstaltungen),
        title: 'Veranstaltungen — Tanzschule Family & Friends',
      },
      {
        path: 'galerie',
        loadComponent: () => import('./pages/galerie/galerie').then(m => m.Galerie),
        title: 'Galerie — Tanzschule Family & Friends',
      },
      {
        path: 'neuigkeiten',
        loadComponent: () => import('./pages/neuigkeiten/neuigkeiten').then(m => m.Neuigkeiten),
        title: 'Neuigkeiten — Tanzschule Family & Friends',
      },
      {
        path: 'neuigkeiten/:slug',
        loadComponent: () =>
          import('./pages/neuigkeiten/detail/neuigkeiten-detail').then(m => m.NeuigkeitenDetail),
        title: 'Beitrag — Tanzschule Family & Friends',
      },
      {
        path: 'ueber-uns',
        loadComponent: () => import('./pages/ueber-uns/ueber-uns').then(m => m.UeberUns),
        title: 'Über uns — Tanzschule Family & Friends',
      },
      {
        path: 'kontakt',
        loadComponent: () => import('./pages/kontakt/kontakt').then(m => m.Kontakt),
        title: 'Kontakt — Tanzschule Family & Friends',
      },
      {
        path: 'gutscheine',
        loadComponent: () => import('./pages/gutscheine/gutscheine').then(m => m.Gutscheine),
        title: 'Gutscheine — Tanzschule Family & Friends',
      },
      {
        path: 'faq',
        loadComponent: () => import('./pages/faq/faq').then(m => m.Faq),
        title: 'FAQ — Tanzschule Family & Friends',
      },
      {
        path: 'impressum',
        loadComponent: () => import('./pages/impressum/impressum').then(m => m.Impressum),
        title: 'Impressum — Tanzschule Family & Friends',
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
