import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

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

  // ─── URL-Sync `?page=` ──────────────────────────────────────────
  //
  // Aktuelle Seite landet als ?page=4 in der URL. Klick auf ein Album
  // pusht /galerie/<alias>; Browser-Back fuehrt zurueck zur Galerie-
  // Liste auf der Seite die der User vorher angeschaut hat — statt
  // immer wieder auf Seite 1 zu landen.
  //
  // Fehler-Toleranz: ungueltige Werte (nicht-Zahl, 0, negativ, > totalPages)
  // werden auf 1 bzw. totalPages geklammert. URL bleibt aber stehen
  // damit der User merkt wenn er einen kaputten Bookmark hat.

  private readonly urlPageParam = toSignal(
    this.route.queryParamMap.pipe(map(p => p.get('page') ?? '')),
    { initialValue: '' },
  );

  protected readonly totalCount = computed(() => this.allAlbums().length);
  protected readonly isEmpty = computed(
    () => !this.loading() && this.totalCount() === 0,
  );

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalCount() / ALBUMS_PER_PAGE)),
  );

  protected readonly currentPage = computed(() => {
    const raw = this.urlPageParam();
    if (!raw) return 1;
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return 1;
    return Math.min(parsed, this.totalPages());
  });

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

  // ─── Aktionen ───────────────────────────────────────────────────

  /**
   * Seitenwechsel: page landet als Query-Param in der URL.
   * Seite 1 -> Param wird entfernt (huebschere Default-URL ohne ?page=1).
   * replaceUrl=true, damit jeder Pagination-Klick keinen History-Eintrag
   * macht — der Back-Button springt direkt zur Seite vor der Galerie.
   */
  protected goToPage(page: number): void {
    const clamped = Math.max(1, Math.min(this.totalPages(), page));
    this.navigatePage(clamped);
  }

  protected prev(): void {
    if (this.canPrev()) this.navigatePage(this.currentPage() - 1);
  }

  protected next(): void {
    if (this.canNext()) this.navigatePage(this.currentPage() + 1);
  }

  private navigatePage(page: number): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: page === 1 ? null : page },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
