import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { AlbumCover } from '../album-cover/album-cover';
import { GalleryApiService } from '../../../core/services/gallery-api.service';
import { Seo } from '../../../core/services/seo';
import { Spinner } from '../../../shared/spinner/spinner';
import {
  GalleryStore,
  mapPhoto,
  type Album,
  type Photo,
} from '../galerie-data';
import { Lightbox } from '../lightbox/lightbox';

@Component({
  selector: 'app-galerie-detail',
  imports: [RouterLink, AlbumCover, Lightbox, Spinner],
  templateUrl: './galerie-detail.html',
  styleUrl: './galerie-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GalerieDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(Seo);
  private readonly store = inject(GalleryStore);
  private readonly api = inject(GalleryApiService);

  /** Alias aus URL — wird im Routing als :alias geliefert. */
  protected readonly alias = toSignal(
    this.route.paramMap.pipe(map(p => p.get('alias') ?? '')),
    { initialValue: '' },
  );

  protected readonly storeLoading = this.store.loading;
  protected readonly album = computed<Album | null>(
    () => this.store.byAlias(this.alias()),
  );

  /**
   * Not-found: Alben-Store fertig geladen, aber Alias ist keiner aus
   * der Liste. Wir leiten zur Galerie-Uebersicht zurueck.
   */
  protected readonly notFound = computed(
    () => !this.storeLoading() && this.alias() !== '' && this.album() === null,
  );

  /**
   * Bilder werden separat geladen sobald das Album-Objekt vorliegt.
   * `null` solange noch lädt / nicht geladen, `[]` wenn fertig aber leer.
   */
  protected readonly photos = signal<readonly Photo[] | null>(null);
  protected readonly photosLoading = computed(() => this.photos() === null);

  protected readonly lightboxIdx = signal<number | null>(null);
  protected readonly lightboxOpen = computed(() => this.lightboxIdx() !== null);

  constructor() {
    // SEO-Meta-Tags + Not-Found-Redirect
    effect(() => {
      const a = this.album();
      if (a) {
        this.seo.set({
          title: a.title,
          description:
            a.description
            || `Bildergalerie "${a.title}" der Tanzschule Family & Friends in Neumünster.`,
          image: a.coverUrl ?? undefined,
        });
        return;
      }
      if (this.notFound()) {
        this.router.navigate(['/galerie'], { replaceUrl: true });
      }
    });

    // Bilder laden sobald Album bekannt. Album-ID-Wechsel triggert
    // automatisch neuen Call.
    effect(() => {
      const a = this.album();
      if (!a) {
        this.photos.set(null);
        return;
      }
      // Reset waehrend des Ladens
      this.photos.set(null);
      this.api.getAlbumImages(a.id).subscribe({
        next: r => this.photos.set(r.images.map(mapPhoto)),
        error: () => this.photos.set([]),
      });
    });
  }

  protected openLightbox(idx: number): void {
    this.lightboxIdx.set(idx);
  }

  protected closeLightbox(): void {
    this.lightboxIdx.set(null);
  }

  protected onThumbKey(event: KeyboardEvent, idx: number): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openLightbox(idx);
    }
  }
}
