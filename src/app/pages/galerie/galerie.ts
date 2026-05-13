import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { AlbumCover } from './album-cover/album-cover';
import { ALBUMS_PER_PAGE, GalleryStore, type Album } from './galerie-data';

interface PaginationToken {
  readonly kind: 'page' | 'ellipsis';
  readonly value: number;
  readonly key: string;
}

@Component({
  selector: 'app-galerie',
  imports: [RouterLink, AlbumCover],
  templateUrl: './galerie.html',
  styleUrl: './galerie.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Galerie {
  private readonly store = inject(GalleryStore);

  protected readonly loading = this.store.loading;
  /**
   * API liefert Alben bereits in der vom Chef im Joomla-Backend per
   * Drag&Drop gepflegten Reihenfolge (sortiert nach `c.lft` aus dem
   * Nested-Set-Model). Wir respektieren die Reihenfolge 1:1 — kein
   * client-seitiges Re-Sort.
   */
  protected readonly allAlbums = computed<readonly Album[]>(
    () => this.store.albums() ?? [],
  );

  protected readonly currentPage = signal(1);

  protected readonly totalCount = computed(() => this.allAlbums().length);
  protected readonly isEmpty = computed(
    () => !this.loading() && this.totalCount() === 0,
  );

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalCount() / ALBUMS_PER_PAGE)),
  );

  protected readonly pageAlbums = computed<readonly Album[]>(() => {
    const start = (this.currentPage() - 1) * ALBUMS_PER_PAGE;
    return this.allAlbums().slice(start, start + ALBUMS_PER_PAGE);
  });

  protected readonly canPrev = computed(() => this.currentPage() > 1);
  protected readonly canNext = computed(() => this.currentPage() < this.totalPages());

  protected readonly paginationTokens = computed<readonly PaginationToken[]>(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const tokens: PaginationToken[] = [];
    let lastEllipsisKey = 0;
    for (let p = 1; p <= total; p++) {
      const show = p === 1 || p === total || Math.abs(p - current) <= 1;
      const ellipsisBefore = p === current - 2 && current > 3;
      const ellipsisAfter = p === current + 2 && current < total - 2;
      if (ellipsisBefore || ellipsisAfter) {
        lastEllipsisKey++;
        tokens.push({ kind: 'ellipsis', value: 0, key: `e${lastEllipsisKey}` });
        continue;
      }
      if (!show) {
        continue;
      }
      tokens.push({ kind: 'page', value: p, key: `p${p}` });
    }
    return tokens;
  });

  protected goToPage(page: number): void {
    const clamped = Math.max(1, Math.min(this.totalPages(), page));
    this.currentPage.set(clamped);
  }

  protected prev(): void {
    if (this.canPrev()) {
      this.currentPage.update(p => p - 1);
    }
  }

  protected next(): void {
    if (this.canNext()) {
      this.currentPage.update(p => p + 1);
    }
  }
}
