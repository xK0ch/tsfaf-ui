import {
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';

/**
 * Cover-/Thumbnail-Renderer fuer die Galerie. Zeigt das echte Bild
 * wenn eine URL gegeben ist, ansonsten einen neutralen Platzhalter.
 * `loading="lazy"` damit nur sichtbare Bilder geladen werden — wichtig
 * wenn ein Album 200+ Thumbnails hat.
 */
@Component({
  selector: 'app-album-cover',
  template: `
    @if (imageUrl(); as url) {
      <img
        [src]="url"
        [alt]="imageAlt()"
        [attr.loading]="eager() ? 'eager' : 'lazy'"
        decoding="async"
        class="album-cover-img"
      />
    } @else {
      <div class="album-cover-placeholder" aria-hidden="true">
        <span class="album-cover-placeholder-icon">🖼</span>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .album-cover-img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .album-cover-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #2a2520 0%, #1e2e32 100%);
      color: rgba(255, 255, 255, 0.5);
    }
    .album-cover-placeholder-icon {
      font-size: 32px;
      filter: grayscale(0.3);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlbumCover {
  /** Bild-URL. null/leer rendert den Platzhalter. */
  readonly imageUrl = input<string | null>(null);
  /** Alt-Text fuers <img>. Sollte immer befuellt sein wenn imageUrl gesetzt. */
  readonly imageAlt = input<string>('');
  /**
   * Wenn true wird das Bild eager geladen (z.B. above-the-fold).
   * Default lazy fuer alle Bilder in Grids.
   */
  readonly eager = input<boolean>(false);
}
