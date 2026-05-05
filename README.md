# tsfaf-ui

Frontend für die ADTV-Tanzschule Family &amp; Friends Neumünster.
Angular 21 Standalone Workspace, signal-basiert, OnPush, Lazy-Routing.

## Voraussetzungen

- Node.js 20 oder 22 (LTS)
- npm 11 (über `package.json#packageManager` festgelegt)

## Setup

```bash
npm install
npm start          # ng serve auf http://localhost:4200
```

Weitere Skripte:

```bash
npm run build      # Production-Build nach dist/tsfaf-ui
npm run watch      # Build im Watch-Modus (Development-Konfiguration)
npm test           # Vitest
```

## Stand

Das Projekt befindet sich in einer frühen Vorschau-Phase. Vorhanden sind:

- Globale Design-Tokens (Farben, Type-Scale, Spacing, Radien, Shadows, Motion) in `src/styles.scss`, übernommen aus dem Design-System (Claude Design).
- Layout-Wrapper (Header mit Mobile-Drawer + Footer) in `src/app/layout/`.
- Lazy-Loading-Routing für alle zehn Seiten in `src/app/app.routes.ts`.
- Vollständige Startseite in `src/app/pages/home/` mit allen sieben Sektionen aus dem Design (Hero, Zielgruppen, Tanzstile, Veranstaltungen, Neuigkeiten, Kontakt-Strip, Gutschein-Band).
- Stub-Komponenten für die übrigen neun Seiten.

Nicht enthalten:

- Produktivbilder (alle Seiten arbeiten aktuell mit dem Logo aus `public/logo.png` und SVG-Patterns).
- Echte API-Anbindung (siehe Roadmap).

## Verzeichnis-Struktur

```
src/
├── index.html              Manrope-Font-Preconnect, lang="de"
├── styles.scss             Design-Tokens, Reset, globale UI-Klassen
└── app/
    ├── app.ts              Root-Component (nur <router-outlet/>)
    ├── app.config.ts       Provider-Setup
    ├── app.routes.ts       Lazy-Routes (Layout-Wrapper + 10 Seiten)
    ├── layout/
    │   ├── layout.ts       Wrapper aus Header + <router-outlet/> + Footer
    │   ├── header/         Fixed Header, Scroll-Shrink, Mobile-Drawer
    │   └── footer/         Dark-Theme-Footer mit 4-Spalten-Grid
    └── pages/              Eine Komponente pro Route, alle ChangeDetectionStrategy.OnPush
        ├── home/                Vollständig (Hero, Zielgruppen, Tanzstile, ...)
        ├── kurse/               Stub
        ├── veranstaltungen/     Stub
        ├── galerie/             Stub
        ├── neuigkeiten/         Stub
        ├── ueber-uns/           Stub
        ├── kontakt/             Stub
        ├── gutscheine/          Stub
        ├── faq/                 Stub
        └── impressum/           Stub
```

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

- Standalone-Komponenten, kein NgModule, kein `standalone: true` (Default in Angular 20+).
- `ChangeDetectionStrategy.OnPush` in jedem `@Component`.
- `inject()` statt Constructor-Injection.
- Signals für State, `computed()` für abgeleiteten State.
- Native Control-Flow (`@if`, `@for`, `@switch`), keine Strukturdirektiven.
- `class`/`style`-Bindings, nicht `ngClass`/`ngStyle`.
- `NgOptimizedImage` für statische Bilder.
- Reactive Forms statt Template-driven Forms.
- Host-Bindings im `host`-Object des Decorators, nicht via `@HostBinding`/`@HostListener`.
- Detail-Vorgaben: siehe [`.claude/CLAUDE.md`](.claude/CLAUDE.md).

## Roadmap

Die Foundation und die Startseite sind fertig. Offen:

1. **Seiten-Implementierungen.** Die anderen neun Routen sind Stubs. Reihenfolge nach Pattern-Wiederverwendung:
   1. `kurse` — etabliert das List-/Filter-Pattern, wiederverwendbar für `veranstaltungen`, `neuigkeiten`, `galerie`.
   2. `kontakt` — etabliert das Form-Pattern, wiederverwendbar für `gutscheine`.
   3. `ueber-uns` — Marketing-Seite analog zu `home`.
   4. `veranstaltungen`, `neuigkeiten`, `galerie`, `gutscheine`.
   5. `faq`, `impressum` — statische Inhalte.
2. **Echte Bilder.** Aktuell ausschließlich SVG-Patterns und das Logo (`public/logo.png`). Nach Abstimmung mit dem Kunden: WebP plus `srcset` über `NgOptimizedImage`.
3. **API-Anbindung.** Joomla- und Cotas-Endpunkte, via Service-Layer pro Domäne (`CourseService`, `EventService`, `NewsService`, ...). Aktuell stehen die Daten als hartcodierte Mocks in den Komponenten.

## Lizenz

Privates Projekt der Tanzschule Family &amp; Friends, alle Rechte vorbehalten.
