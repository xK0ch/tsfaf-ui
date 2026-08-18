import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Datenschutz } from './datenschutz';

describe('Datenschutz', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [Datenschutz],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(Datenschutz);
    fixture.detectChanges();
    return fixture;
  }

  // ─── Grundstruktur ──────────────────────────────────────────────

  it('rendert den Datenschutz-Titel als h1', () => {
    const fixture = setup();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Datenschutzerklärung');
  });

  it('zeigt das Stand-Datum', () => {
    const fixture = setup();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.last-updated')?.textContent).toContain('Mai 2026');
  });

  it('rendert keine Tab-Leiste (Datenschutz steht als eigene Seite)', () => {
    const fixture = setup();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.tab-bar')).toBeNull();
    expect(el.querySelectorAll('[role="tab"]').length).toBe(0);
  });

  // ─── Verlinkung zum Impressum ──────────────────────────────────

  it('verlinkt im Text auf /impressum (ohne queryParams)', () => {
    const fixture = setup();
    const el = fixture.nativeElement as HTMLElement;
    const link = Array.from(el.querySelectorAll('a')).find(
      a => a.getAttribute('href') === '/impressum',
    );
    expect(link).not.toBeUndefined();
    expect(link?.textContent).toContain('Impressum');
  });

  // ─── Inhaltliche Pflichtpunkte (Smoke-Tests) ───────────────────

  it('nennt verantwortliche Stelle "Tanzschule Family & Friends"', () => {
    const fixture = setup();
    const txt = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(txt).toContain('Tanzschule Family & Friends');
    expect(txt).toContain('Uwe & Tabea Höftmann');
  });

  it('nennt die Aufsichtsbehoerde ULD Schleswig-Holstein', () => {
    const fixture = setup();
    const txt = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(txt).toContain('Unabhängiges Landeszentrum für Datenschutz Schleswig-Holstein');
    expect(txt).toContain('Kiel');
  });

  it('weist auf Google Fonts hin (USA-Transfer + Rechtsgrundlage)', () => {
    const fixture = setup();
    const txt = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(txt).toContain('Google Fonts');
    expect(txt).toContain('Art. 6 Abs. 1 lit. f DSGVO');
  });

  it('beschreibt die 2-Klick-Loesung fuer OpenStreetMap', () => {
    const fixture = setup();
    const txt = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(txt).toContain('OpenStreetMap');
    expect(txt).toContain('2-Klick');
  });

  it('beschreibt Cotas inkl. Auftragsverarbeitung nach Art. 28 DSGVO', () => {
    const fixture = setup();
    const txt = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(txt).toContain('Cotas');
    expect(txt).toContain('Auftragsverarbeitung');
    expect(txt).toContain('Art. 28 DSGVO');
  });

  it('listet die wichtigsten Betroffenenrechte (DSGVO Art. 15-21)', () => {
    const fixture = setup();
    const txt = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(txt).toContain('Art. 15 DSGVO');
    expect(txt).toContain('Art. 16 DSGVO');
    expect(txt).toContain('Art. 17 DSGVO');
    expect(txt).toContain('Art. 21 DSGVO');
  });

  it('nennt das Widerrufsrecht nach Art. 7 Abs. 3 DSGVO', () => {
    const fixture = setup();
    const txt = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(txt).toContain('Art. 7 Abs. 3 DSGVO');
  });

  it('beschreibt Tanzschulfilm-Embed mit Click-to-Load', () => {
    const fixture = setup();
    const txt = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(txt).toContain('Tanzschulfilm');
    expect(txt).toContain('video.tsfaf.de');
    expect(txt).toContain('Click-to-Load');
    expect(txt).toContain('Art. 6 Abs. 1 lit. a DSGVO');
  });

  it('Cookies-Abschnitt: technisch notwendig, kein Tracking', () => {
    const fixture = setup();
    const txt = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(txt).toContain('technisch notwendige Cookies');
    expect(txt).toContain('§ 25 Abs. 2 Nr. 2 TDDDG');
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
