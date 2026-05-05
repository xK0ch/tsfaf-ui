import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-galerie',
  template: `
    <div class="container page-stub">
      <p class="page-stub-eyebrow">Galerie</p>
      <h1>Galerie</h1>
      <p class="page-stub-text">Bildergalerie mit Lightbox folgt hier.</p>
    </div>
  `,
  styles: `
    :host { display: block; padding-top: 120px; }
    .page-stub { padding-block: var(--space-48); }
    .page-stub-eyebrow {
      font-size: 11px; font-weight: 700; letter-spacing: .12em;
      text-transform: uppercase; color: var(--color-primary);
      margin-bottom: var(--space-8);
    }
    h1 { font-size: var(--text-h1); margin-bottom: var(--space-16); }
    .page-stub-text { color: var(--color-text-muted); max-width: 60ch; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Galerie {}
