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
  templateUrl: './album-cover.html',
  styleUrl: './album-cover.scss',
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
