# tsfaf-ui

Frontend für die ADTV-Tanzschule Family &amp; Friends Neumünster.
Angular 22 Standalone Workspace, signal-basiert, OnPush, Lazy-Routing, Vitest.

## Voraussetzungen

- Node.js `^22.22.3 || ^24.15.0 || ^26.0.0`
- npm 11 (über `package.json#packageManager` festgelegt)
- TypeScript `>=6.0.0 <6.1.0` (kommt automatisch via `npm install`)

## Setup

```bash
npm install
npm start          # ng serve auf http://localhost:4200
```

Weitere Skripte:

```bash
npm run build      # Production-Build nach dist/tsfaf-ui
npm run watch      # Build im Watch-Modus (Development-Konfiguration)
npm test           # Vitest (vitest run)
```

## Stand

Alle elf Seiten sind voll implementiert, getestet und an die Backends angebunden.

- **Globale Design-Tokens** (Farben, Type-Scale, Spacing, Radien, Shadows, Motion) in `src/styles.scss`.
- **Layout-Wrapper** (Header mit Mobile-Drawer + Footer) in `src/app/layout/`.
- **Lazy-Loading-Routing** für alle elf Seiten in `src/app/app.routes.ts` (Path-Location, SPA-Rewrite in `public/.htaccess`).
- **Service-Layer** für die vier Backends (Cotas, gallery-api.php, kontakt-api.php, Joomla Web Services) in `src/app/core/services/`.
- **SEO** mit pro-Route Meta-Tags via `SeoTitleStrategy` + dynamischen Tags auf Detail-Seiten (`Seo`-Service).
- **Tests**: 389 Vitest-Tests, davon Backend-Mocks + Komponenten-Smoke-Tests + Logik-Tests.

## Verzeichnis-Struktur

```
public/
├── .htaccess                         SPA-Rewrite + Legacy-Joomla-301-Redirects + Caching/Compression
├── robots.txt                        Allow + Sitemap-Verweis
├── sitemap.xml                       Statische Routen für Suchmaschinen
├── favicon.ico
└── logo.png                          Default og:image fuer Sharing-Previews
src/
├── index.html                        Manrope-Font-Preconnect, lang="de", Default-Meta-Tags
├── styles.scss                       Design-Tokens, Reset, globale UI-Klassen
├── environments/
│   ├── environment.ts                Prod-Config (Cotas-, Gallery-, Joomla-, Kontakt-URLs + Tokens)
│   └── environment.development.ts    Dev-Proxy-Pfade
└── app/
    ├── app.ts                        Root-Component (nur <router-outlet/>)
    ├── app.config.ts                 Provider-Setup, Router mit Path-Location, SeoTitleStrategy
    ├── app.routes.ts                 Lazy-Routes (Layout-Wrapper + 15 Endpunkte, jede mit title + data.description)
    ├── core/
    │   ├── models/                   Domain-Typen (Cotas, Joomla, Kontakt)
    │   └── services/                 cotas-, gallery-, joomla-, kontakt-api.service.ts, seo.ts, seo-title.strategy.ts
    ├── layout/
    │   ├── layout.ts                 Wrapper aus Header + <router-outlet/> + Footer
    │   ├── header/                   Fixed Header, Scroll-Shrink, Mobile-Drawer
    │   └── footer/                   Dark-Theme-Footer mit 4-Spalten-Grid
    └── pages/                        Eine Komponente pro Route, alle OnPush
        ├── home/                     Hero-Video, Zielgruppen, News, Events, Kontakt-Strip
        ├── kurse/                    Kurs-Liste + Filter
        │   └── anmeldung/            Kursanmelde-Formular
        ├── veranstaltungen/          Events-Liste + Detail-Panel
        │   └── event-detail-panel/
        ├── galerie/                  Album-Liste, paginiert
        │   ├── album-cover/
        │   ├── detail/               Album-Detail mit Lightbox
        │   └── lightbox/
        ├── neuigkeiten/              News-Liste + Sidebar
        │   ├── detail/
        │   ├── news-cover/
        │   └── news-sidebar/
        ├── ueber-uns/                Team, Tanzschulfilm, Räumlichkeiten, Partner
        │   └── team-card/
        ├── kontakt/                  Kontaktformular + OSM-Karte (Click-to-Load)
        ├── gutscheine/               Gutschein-Vorlagen
        │   └── bestellung/           Gutschein-Bestellformular
        ├── faq/                      FAQ-Accordion
        ├── datenschutz/              Datenschutzerklärung
        └── impressum/                Impressum
```

## Backend-Anbindung

Die Konfiguration der Backends liegt in `src/environments/environment.ts`. Vier separate Backends:

| Endpoint                              | Zweck                                                | Auth                       |
| ------------------------------------- | ---------------------------------------------------- | -------------------------- |
| `cotasApiBase`                        | Kurse, Anmeldungen, Gutschein-Bestellungen           | Session-basiert (Cotas)    |
| `gallery-api.php` (`galleryApiBase`)  | JoomGallery-Alben + Bilder, Watermark-Proxy          | `X-Gallery-Token` Header   |
| `kontakt-api.php` (`kontaktApiBase`)  | Kontaktformular-POST → Mail an `info@tanzschule-family-and-friends.de` | `X-Kontakt-Token` Header   |
| Joomla Web Services (`joomlaApiBase`) | News, FAQ, Team, Veranstaltungen (CMS-Inhalte)       | `X-Joomla-Token` Header    |

**Externer Media-Storage** unter `mediaBaseUrl` (`https://video.tsfaf.de/v2/Webseite`):
Hero-Video, Tanzschulfilm, Altersgruppen-Fotos und Partner-Logos liegen nicht im Build-Bundle,
sondern werden vom Subdomain-Server ausgeliefert. Spart Build-Größe.

**Tokens NICHT committen.** `environment.ts`/`environment.development.ts` enthalten Platzhalter,
die lokal durch echte Tokens aus dem Passwort-Manager ersetzt werden. Vor jedem `git commit` Token-Dance:
Token-Diff stashen, committen, restashen.

Im Dev werden die HTTP-Calls über `proxy.conf.json` an die echten Backends gepiped (umgeht CORS).

## SEO

Pro Route werden `<title>`, `meta description`, Open-Graph- und Twitter-Card-Tags plus
`<link rel="canonical">` über die `SeoTitleStrategy` aus `core/services/seo-title.strategy.ts`
gesetzt. Statische Routen liefern Title und Description aus den Route-`data`-Feldern in
`app.routes.ts`. Detail-Seiten (Album, News, Gutschein, Kursanmeldung) überschreiben das
nach dem Datenladen über den `Seo`-Service mit echten Titeln und Cover-Bildern, sodass
Sharing-Previews auf WhatsApp/Facebook das jeweilige Album-Cover, Artikel-Bild oder
Gutschein-Motiv zeigen.

- `public/robots.txt` und `public/sitemap.xml` werden vom Build nach `dist/` kopiert.
- Default-Tags in `src/index.html` greifen für Crawler, die kein JavaScript ausführen,
  und für den Moment vor dem ersten Routing-Update.
- Legacy-301-Redirects in `public/.htaccess` mappen alte Joomla-URLs (`.html`-Suffix,
  `/component/joomgallery/*`, `index.php?option=com_*`) auf die neuen Angular-Routen.

## SPA-Hosting auf IONOS

Der Production-Build geht 1:1 in den Webroot. Die `public/.htaccess` macht zwei Dinge:

1. **SPA-Rewrite**: alles was nicht als echte Datei/Ordner existiert wird auf
   `index.html` umgeleitet, damit der Angular-Router clientseitig übernimmt.
2. **Legacy-Redirects** für alte Joomla-URLs (siehe SEO-Abschnitt).

Joomla selbst läuft unter der Subdomain `joomla.tanzschule-family-and-friends.de` und
liefert nur noch die `/api/...`-Endpoints, `gallery-api.php`, `kontakt-api.php` sowie die
Bild-Assets aus. Das Joomla-Frontend ist per `robots.txt` + `X-Robots-Tag`-Header für
Suchmaschinen ausgesperrt; Direkt-Aufrufe der Joomla-Homepage werden auf die Haupt-Domain
umgeleitet.

## Globale UI-Klassen (in `styles.scss`)

Diese Klassen sind seitenübergreifend nutzbar, ohne dass eine Komponente sie selbst stylen muss.

| Klasse                | Varianten / Modifier                                                                |
| --------------------- | ----------------------------------------------------------------------------------- |
| `.container`          | Responsive Page-Wrapper mit max-width 1200                                          |
| `.btn`                | `.btn-primary`, `.btn-secondary`, `.btn-outline-secondary`, `.btn-outline-light`, `.btn-ghost`, `.btn-icon`; Größen `.btn-sm`, `.btn-lg` |
| `.badge`              | `.badge-open`, `.badge-few`, `.badge-full` mit `.badge-dot`                         |
| `.tag`                | `.tag-primary`, `.tag-secondary`                                                    |
| `.date-pill`          | mit `.date-pill-day`, `.date-pill-month`                                            |
| `.field` / `.input`   | `.field-label`, `.field-hint`, `.field-error`, `.input-error`, `.select-wrap`, `.checkbox-label`, `.radio-label` |
| `.card`               | `.card-interactive` für Hover-Lift                                                  |
| `.accordion`          | `.accordion-item`, `.accordion-trigger`, `.accordion-icon` (`.open`), `.accordion-body` (`.open`) |
| `.filter-bar`         | `.filter-chip` (`.active`)                                                          |
| `.pagination`         | `.page-btn` (`.active`)                                                             |
| `.skeleton`           | `.skeleton-text`, `.skeleton-title`, `.skeleton-card`                               |
| `.section`            | `.section-sm`, `.section-header` (`.section-header-split`), `.section-eyebrow`, `.section-title`, `.section-sub`, `.section-link` |

## Coding-Konventionen

- Standalone-Komponenten, kein NgModule, kein `standalone: true` (Default seit Angular 20).
- `ChangeDetectionStrategy.OnPush` in jedem `@Component` (seit Angular 22 sowieso Default).
- `inject()` statt Constructor-Injection.
- Signals für State, `computed()` für abgeleiteten State.
- Native Control-Flow (`@if`, `@for`, `@switch`), keine Strukturdirektiven.
- `class`/`style`-Bindings, nicht `ngClass`/`ngStyle`.
- `NgOptimizedImage` für statische Bilder.
- Reactive Forms statt Template-driven Forms.
- Host-Bindings im `host`-Object des Decorators, nicht via `@HostBinding`/`@HostListener`.
- `strictTemplates: true`, keine extended-Diagnostic-Suppressions.
- Detail-Vorgaben: siehe [`.claude/CLAUDE.md`](.claude/CLAUDE.md).

## Lizenz

Code: [MIT-Lizenz](LICENSE), Copyright (c) 2026 Fynn Koch.

Markenname, Logo, Fotos, Videos und redaktionelle Inhalte der ADTV-Tanzschule
Family &amp; Friends sind nicht von der MIT-Lizenz abgedeckt und bleiben Eigentum
der Tanzschule. Details siehe [`LICENSE`](LICENSE).
