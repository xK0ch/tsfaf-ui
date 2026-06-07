import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  effect,
  inject,
  signal,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';

interface NavItem {
  label: string;
  path: string;
}

@Component({
  selector: 'app-header',
  imports: [NgOptimizedImage, RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.scrolled]': 'scrolled()',
    '(window:scroll)': 'onScroll()',
    '(document:keydown.escape)': 'closeDrawer()',
  },
})
export class Header {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  protected readonly scrolled = signal(false);
  protected readonly drawerOpen = signal(false);

  protected readonly navItems: readonly NavItem[] = [
    { label: 'Neuigkeiten',     path: '/neuigkeiten' },
    { label: 'Kurse',           path: '/kurse' },
    { label: 'Veranstaltungen', path: '/veranstaltungen' },
    { label: 'Galerie',         path: '/galerie' },
    { label: 'Gutscheine',      path: '/gutscheine' },
    { label: 'Über uns',        path: '/ueber-uns' },
    { label: 'FAQ',             path: '/faq' },
    { label: 'Kontakt',         path: '/kontakt' },
  ];

  constructor() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.drawerOpen.set(false));

    effect(() => {
      const open = this.drawerOpen();
      this.document.body.style.overflow = open ? 'hidden' : '';
    });
  }

  protected onScroll(): void {
    this.scrolled.set(this.document.defaultView!.scrollY > 20);
  }

  protected toggleDrawer(): void {
    this.drawerOpen.update(v => !v);
  }

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
  }
}
