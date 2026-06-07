import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Header } from './header';

interface HeaderCmp {
  navItems: ReadonlyArray<{ label: string; path: string }>;
  drawerOpen: { (): boolean; set(v: boolean): void };
  scrolled: { (): boolean };
}

describe('Header', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [Header],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(Header);
    fixture.detectChanges();
    return fixture;
  }

  // ─── Navigation ────────────────────────────────────────────────

  it('navItems beginnen mit Neuigkeiten vor Kurse', () => {
    const fixture = setup();
    const cmp = fixture.componentInstance as unknown as HeaderCmp;
    expect(cmp.navItems[0].label).toBe('Neuigkeiten');
    expect(cmp.navItems[1].label).toBe('Kurse');
  });

  it('rendert alle navItems als Desktop-Nav-Links', () => {
    const fixture = setup();
    const cmp = fixture.componentInstance as unknown as HeaderCmp;
    const links = (fixture.nativeElement as HTMLElement).querySelectorAll(
      '.site-nav .site-nav-link',
    );
    expect(links.length).toBe(cmp.navItems.length);
  });

  it('rendert Mobile-Drawer-Links spiegelnd zur Desktop-Nav', () => {
    const fixture = setup();
    const cmp = fixture.componentInstance as unknown as HeaderCmp;
    const links = (fixture.nativeElement as HTMLElement).querySelectorAll(
      '.mobile-nav .mobile-nav-link',
    );
    expect(links.length).toBe(cmp.navItems.length);
  });

  it('Logo verlinkt auf /', () => {
    const fixture = setup();
    const logo = (fixture.nativeElement as HTMLElement).querySelector(
      'a.site-logo',
    ) as HTMLAnchorElement | null;
    expect(logo).not.toBeNull();
    expect(logo!.getAttribute('href')).toBe('/');
  });

  it('CTA-Button verlinkt auf /kurse', () => {
    const fixture = setup();
    const cta = (fixture.nativeElement as HTMLElement).querySelector(
      'a.site-cta',
    ) as HTMLAnchorElement | null;
    expect(cta?.getAttribute('href')).toBe('/kurse');
  });

  // ─── Drawer-Verhalten ──────────────────────────────────────────

  it('drawerOpen initial false', () => {
    const fixture = setup();
    const cmp = fixture.componentInstance as unknown as HeaderCmp;
    expect(cmp.drawerOpen()).toBe(false);
  });

  it('Hamburger-Klick öffnet den Drawer (toggle)', () => {
    const fixture = setup();
    const cmp = fixture.componentInstance as unknown as HeaderCmp;
    const burger = (fixture.nativeElement as HTMLElement).querySelector(
      '.site-hamburger',
    ) as HTMLButtonElement;
    burger.click();
    fixture.detectChanges();
    expect(cmp.drawerOpen()).toBe(true);
    burger.click();
    fixture.detectChanges();
    expect(cmp.drawerOpen()).toBe(false);
  });

  it('Drawer-Klasse spiegelt drawerOpen()', () => {
    const fixture = setup();
    const cmp = fixture.componentInstance as unknown as HeaderCmp;
    cmp.drawerOpen.set(true);
    fixture.detectChanges();
    const drawer = (fixture.nativeElement as HTMLElement).querySelector(
      '.mobile-drawer',
    );
    expect(drawer?.classList.contains('open')).toBe(true);
  });

  // ─── Kein Instagram-Icon mehr im Header ────────────────────────

  it('rendert KEIN Instagram-Icon mehr im Header (wurde in Footer verschoben)', () => {
    const fixture = setup();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.site-instagram'),
    ).toBeNull();
  });
});
