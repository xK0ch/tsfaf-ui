import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AlbumCover } from './album-cover/album-cover';
import { Album, ALBUMS, ALBUMS_PER_PAGE } from './galerie-data';

type SortMode = 'newest' | 'oldest';

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
  protected readonly sort = signal<SortMode>('newest');
  protected readonly currentPage = signal(1);

  protected readonly sortedAlbums = computed<readonly Album[]>(() => {
    const arr = [...ALBUMS];
    const mode = this.sort();
    if (mode === 'newest') {
      arr.sort((a, b) => b.date.localeCompare(a.date));
    } else {
      arr.sort((a, b) => a.date.localeCompare(b.date));
    }
    return arr;
  });

  protected readonly totalCount = computed(() => this.sortedAlbums().length);

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalCount() / ALBUMS_PER_PAGE)),
  );

  protected readonly pageAlbums = computed<readonly Album[]>(() => {
    const start = (this.currentPage() - 1) * ALBUMS_PER_PAGE;
    return this.sortedAlbums().slice(start, start + ALBUMS_PER_PAGE);
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

  protected onSortChange(value: string): void {
    if (value === 'newest' || value === 'oldest') {
      this.sort.set(value);
      this.currentPage.set(1);
    }
  }

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
