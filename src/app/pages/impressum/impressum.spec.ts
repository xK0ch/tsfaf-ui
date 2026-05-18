import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Impressum } from './impressum';

describe('Impressum', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [Impressum],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(Impressum);
    fixture.detectChanges();
    return fixture;
  }

  // ─── Grundstruktur ──────────────────────────────────────────────

  it('rendert den Impressum-Titel als h1', () => {
    const fixture = setup();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Impressum');
  });

  it('zeigt das Stand-Datum', () => {
    const fixture = setup();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.last-updated')?.textContent).toContain('Mai 2026');
  });

  it('rendert keine Tab-Leiste (Datenschutz ist eigene Seite)', () => {
    const fixture = setup();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.tab-bar')).toBeNull();
    expect(el.querySelectorAll('[role="tab"]').length).toBe(0);
  });

  it('rendert keinen Datenschutz-Inhalt mehr', () => {
    const fixture = setup();
    const txt = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(txt).not.toContain('Datenschutzerklärung');
    expect(txt).not.toContain('DSGVO');
  });

  // ─── Inhalt: Pflichtangaben TMG ─────────────────────────────────

  it('nennt Anbieter "Tanzschule Family & Friends" mit Inhabern', () => {
    const fixture = setup();
    const txt = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(txt).toContain('Tanzschule Family & Friends');
    expect(txt).toContain('Uwe & Tabea Höftmann');
    expect(txt).toContain('Georg-Fuhg-Straße 6');
    expect(txt).toContain('24537 Neumünster');
  });

  it('Kontakt: Telefon + E-Mail', () => {
    const fixture = setup();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('a[href="tel:+4943211490"]')).not.toBeNull();
    expect(el.querySelector('a[href="mailto:info@tsfaf.de"]')).not.toBeNull();
  });

  it('zeigt die Umsatzsteuer-ID', () => {
    const fixture = setup();
    const txt = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(txt).toContain('DE262534367');
  });

  it('nennt Verantwortlich nach § 18 Abs. 2 MStV', () => {
    const fixture = setup();
    const txt = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(txt).toContain('§ 18 Abs. 2 MStV');
  });

  it('zeigt Mitgliedschaft ADTV', () => {
    const fixture = setup();
    const txt = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(txt).toContain('Mitgliedschaften');
    expect(txt).toContain('ADTV');
  });

  // ─── Webmaster-Sektion ─────────────────────────────────────────

  it('nennt Webmaster Fynn Koch mit Website + E-Mail', () => {
    const fixture = setup();
    const el = fixture.nativeElement as HTMLElement;
    const txt = el.textContent ?? '';
    expect(txt).toContain('Fynn Koch');
    expect(el.querySelector('a[href="https://fynn-koch.de"]')).not.toBeNull();
    expect(el.querySelector('a[href="mailto:mail@fynn-koch.de"]')).not.toBeNull();
  });

  it('nennt Webmaster Ingo Müller mit Website + E-Mail', () => {
    const fixture = setup();
    const el = fixture.nativeElement as HTMLElement;
    const txt = el.textContent ?? '';
    expect(txt).toContain('Ingo Müller');
    expect(el.querySelector('a[href="https://www.ingomueller.com"]')).not.toBeNull();
    expect(el.querySelector('a[href="mailto:info@ingomueller.com"]')).not.toBeNull();
  });

  // ─── Streitschlichtung ─────────────────────────────────────────

  it('weist auf Abschaltung der EU-ODR-Plattform hin (Verordnung 2024/3228)', () => {
    const fixture = setup();
    const txt = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(txt).toContain('2024/3228');
    expect(txt).toContain('20. Juli 2025');
  });

  it('verlinkt die EU-Liste der Streitbeilegungsstellen', () => {
    const fixture = setup();
    const el = fixture.nativeElement as HTMLElement;
    const link = el.querySelector(
      'a[href="https://consumer-redress.ec.europa.eu/dispute-resolution-bodies"]',
    );
    expect(link).not.toBeNull();
  });

  // ─── Sicherheit: externe Links ─────────────────────────────────

  it('alle externen http-Links oeffnen mit target="_blank" + rel="noopener noreferrer"', () => {
    const fixture = setup();
    const el = fixture.nativeElement as HTMLElement;
    const externalLinks = Array.from(el.querySelectorAll('a')).filter(a =>
      a.getAttribute('href')?.startsWith('http'),
    );
    expect(externalLinks.length).toBeGreaterThan(0);
    for (const a of externalLinks) {
      expect(a.getAttribute('target')).toBe('_blank');
      expect(a.getAttribute('rel')).toContain('noopener');
      expect(a.getAttribute('rel')).toContain('noreferrer');
    }
  });
});
