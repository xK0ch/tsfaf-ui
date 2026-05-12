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

import { NewsStore } from '../neuigkeiten-data';
import { NewsCover } from '../news-cover/news-cover';
import { NewsSidebar } from '../news-sidebar/news-sidebar';

@Component({
  selector: 'app-neuigkeiten-detail',
  imports: [RouterLink, NewsCover, NewsSidebar],
  templateUrl: './neuigkeiten-detail.html',
  styleUrl: './neuigkeiten-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NeuigkeitenDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly document = inject(DOCUMENT);
  private readonly store = inject(NewsStore);

  protected readonly slug = toSignal(
    this.route.paramMap.pipe(map(p => p.get('slug') ?? '')),
    { initialValue: '' },
  );

  protected readonly loading = this.store.loading;
  protected readonly article = computed(() => this.store.bySlug(this.slug()));

  /** True wenn fertig geladen aber kein passender Artikel gefunden wurde. */
  protected readonly notFound = computed(
    () => !this.loading() && this.slug() !== '' && this.article() === null,
  );

  protected readonly copied = signal(false);
  private copyTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly whatsappUrl = computed(() => {
    const a = this.article();
    if (!a) {
      return '';
    }
    const text = `${a.title} – Tanzschule Family und Friends`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  });

  constructor() {
    effect(() => {
      const a = this.article();
      if (a) {
        this.title.setTitle(`${a.title} - Tanzschule Family & Friends`);
        return;
      }
      // Wenn die Daten schon da sind und kein Artikel zum Slug existiert,
      // zurueck zur Uebersicht.
      if (this.notFound()) {
        this.router.navigate(['/neuigkeiten'], { replaceUrl: true });
      }
    });
  }

  protected async copyLink(): Promise<void> {
    const win = this.document.defaultView;
    if (!win) {
      return;
    }
    try {
      await win.navigator.clipboard.writeText(win.location.href);
      this.copied.set(true);
      if (this.copyTimer !== null) {
        clearTimeout(this.copyTimer);
      }
      this.copyTimer = setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Clipboard API may be unavailable. Fail silently.
    }
  }
}
