import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Footer } from './footer';

describe('Footer', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [Footer],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(Footer);
    fixture.detectChanges();
    return fixture;
  }

  // ─── Stammdaten ─────────────────────────────────────────────────

  it('zeigt aktuelle Adresse (Georg-Fuhg-Straße 6, 24537)', () => {
    const fixture = setup();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Georg-Fuhg-Straße 6');
    expect(text).toContain('24537 Neumünster');
  });

  it('zeigt aktuelle E-Mail info@tsfaf.de als mailto-Link', () => {
    const fixture = setup();
    const mailto = (fixture.nativeElement as HTMLElement).querySelector(
      'a[href="mailto:info@tsfaf.de"]',
    );
    expect(mailto).not.toBeNull();
    expect(mailto!.textContent).toContain('info@tsfaf.de');
  });

  it('zeigt Telefonnummer als tel-Link', () => {
    const fixture = setup();
    const tel = (fixture.nativeElement as HTMLElement).querySelector(
      'a[href="tel:+4943211490"]',
    );
    expect(tel?.textContent).toContain('04321');
  });

  it('zeigt KEINE alte Adresse mehr (Kieler Straße)', () => {
    const fixture = setup();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Kieler Straße');
    expect(text).not.toContain('24534');
  });

  // ─── Navigation-Links ──────────────────────────────────────────

  it('rendert Navigation- und Über-uns-Links', () => {
    const fixture = setup();
    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.site-footer-links a'),
    ).map(a => a.getAttribute('href') ?? '');
    expect(links).toEqual(
      expect.arrayContaining([
        '/kurse',
        '/veranstaltungen',
        '/galerie',
        '/gutscheine',
        '/neuigkeiten',
        '/ueber-uns',
        '/faq',
        '/kontakt',
      ]),
    );
  });

  it('rendert Legal-Links (Impressum + Datenschutz)', () => {
    const fixture = setup();
    const legal = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.site-footer-legal a'),
    );
    expect(legal.length).toBeGreaterThanOrEqual(2);
    const hrefs = legal.map(a => a.getAttribute('href') ?? '');
    expect(hrefs).toContain('/impressum');
    expect(hrefs).toContain('/datenschutz');
  });

  // ─── Soziale Medien ────────────────────────────────────────────

  it('rendert eine eigene "Soziale Medien"-Spalte', () => {
    const fixture = setup();
    const headings = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.site-footer-heading'),
    ).map(h => h.textContent?.trim());
    expect(headings).toContain('Soziale Medien');
  });

  it('rendert Instagram-Link mit korrektem href und aria-label', () => {
    const fixture = setup();
    const ig = (fixture.nativeElement as HTMLElement).querySelector(
      'a[href*="instagram.com/tanzschule_family_and_friends"]',
    ) as HTMLAnchorElement | null;
    expect(ig).not.toBeNull();
    expect(ig!.getAttribute('target')).toBe('_blank');
    expect(ig!.getAttribute('rel')).toContain('noopener');
    expect(ig!.getAttribute('aria-label')).toMatch(/Instagram/i);
  });

  it('rendert Facebook-Link mit korrektem href und aria-label', () => {
    const fixture = setup();
    const fb = (fixture.nativeElement as HTMLElement).querySelector(
      'a[href*="facebook.com"]',
    ) as HTMLAnchorElement | null;
    expect(fb).not.toBeNull();
    expect(fb!.getAttribute('target')).toBe('_blank');
    expect(fb!.getAttribute('rel')).toContain('noopener');
    expect(fb!.getAttribute('aria-label')).toMatch(/Facebook/i);
  });

  it('Social-Links sind Icon-only (kein Text-Label im sichtbaren Output)', () => {
    const fixture = setup();
    const links = (fixture.nativeElement as HTMLElement).querySelectorAll(
      '.site-footer-social-link',
    );
    expect(links.length).toBe(2);
    for (const link of Array.from(links)) {
      // textContent kann Whitespace enthalten, aber keine sichtbaren Worte.
      expect(link.textContent?.trim()).toBe('');
      // SVG muss da sein
      expect(link.querySelector('svg')).not.toBeNull();
    }
  });

  // ─── Copyright ─────────────────────────────────────────────────

  it('zeigt das aktuelle Jahr im Copyright', () => {
    const fixture = setup();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    const year = new Date().getFullYear();
    expect(text).toContain(String(year));
  });
});
