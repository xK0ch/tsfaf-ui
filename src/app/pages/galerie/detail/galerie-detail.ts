import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DOCUMENT,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AlbumCover } from '../album-cover/album-cover';
import { findAlbumById, makePhotos, Photo } from '../galerie-data';
import { Lightbox } from '../lightbox/lightbox';

@Component({
  selector: 'app-galerie-detail',
  imports: [RouterLink, AlbumCover, Lightbox],
  templateUrl: './galerie-detail.html',
  styleUrl: './galerie-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GalerieDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly document = inject(DOCUMENT);

  protected readonly id = toSignal(
    this.route.paramMap.pipe(map(p => p.get('id') ?? '')),
    { initialValue: '' },
  );

  protected readonly album = computed(() => findAlbumById(this.id()) ?? null);

  protected readonly photos = computed<readonly Photo[]>(() => {
    const a = this.album();
    return a ? makePhotos(a) : [];
  });

  protected readonly lightboxIdx = signal<number | null>(null);
  protected readonly lightboxOpen = computed(() => this.lightboxIdx() !== null);

  constructor() {
    effect(() => {
      const a = this.album();
      const id = this.id();
      if (a) {
        this.title.setTitle(`${a.title} - Tanzschule Family & Friends`);
        this.document.defaultView?.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (id !== '') {
        this.router.navigate(['/galerie'], { replaceUrl: true });
      }
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
