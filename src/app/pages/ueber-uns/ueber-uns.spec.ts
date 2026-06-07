import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { UeberUns } from './ueber-uns';
import { TeamStore, type TeamMember } from './ueber-uns-data';

function mkMember(over: Partial<TeamMember> = {}): TeamMember {
  return {
    id: 't-1',
    name: 'Tabea Höftmann',
    role: 'ADTV-Tanzlehrerin',
    qualifications: [],
    imageUrl: null,
    imageAlt: '',
    ...over,
  };
}

function makeStoreMock(initial: readonly TeamMember[] | null) {
  const members = signal<readonly TeamMember[] | null>(initial);
  return {
    members,
    loading: computed(() => members() === null),
  };
}

describe('UeberUns', () => {
  function setup(initial: readonly TeamMember[] | null) {
    TestBed.configureTestingModule({
      imports: [UeberUns],
      providers: [
        provideRouter([]),
        { provide: TeamStore, useValue: makeStoreMock(initial) },
      ],
    });
    return TestBed.createComponent(UeberUns);
  }

  // ─── Loading / Empty / Render ───────────────────────────────────

  it('zeigt Loading-Status solange Team noch nicht geladen', () => {
    const fixture = setup(null);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-spinner')?.textContent).toContain(
      'Wird geladen',
    );
    expect(el.querySelector('.team-grid')).toBeNull();
  });

  it('zeigt Empty-State wenn keine Team-Mitglieder', () => {
    const fixture = setup([]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.team-status')?.textContent).toContain(
      'keine Team-Mitglieder',
    );
    expect(el.querySelector('.team-grid')).toBeNull();
  });

  it('rendert eine Card pro Mitglied wenn geladen', () => {
    const fixture = setup([
      mkMember({ id: '1', name: 'Uwe' }),
      mkMember({ id: '2', name: 'Tabea' }),
      mkMember({ id: '3', name: 'Alena' }),
    ]);
    fixture.detectChanges();
    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('app-team-card');
    expect(cards.length).toBe(3);
  });

  // ─── Section-Reihenfolge ────────────────────────────────────────

  it('Section-Reihenfolge: Team -> Einblicke -> Raeumlichkeiten -> Werte', () => {
    const fixture = setup([mkMember()]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const teamSec = el.querySelector('#team');
    const einblickeSec = el.querySelector('#einblicke');
    const roomsSec = el.querySelector('#raeumlichkeiten');
    const werteSec = el.querySelector('#werte');

    expect(teamSec).not.toBeNull();
    expect(einblickeSec).not.toBeNull();
    expect(roomsSec).not.toBeNull();
    expect(werteSec).not.toBeNull();

    // DOCUMENT_POSITION_FOLLOWING = 4 → other follows this
    expect(teamSec!.compareDocumentPosition(einblickeSec!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(einblickeSec!.compareDocumentPosition(roomsSec!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(roomsSec!.compareDocumentPosition(werteSec!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  // ─── Tanzschulfilm (Click-to-Load) ──────────────────────────────

  it('zeigt zunaechst die Video-Poster-Card statt das Video-Element', () => {
    const fixture = setup([mkMember()]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.video-poster')).not.toBeNull();
    expect(el.querySelector('.video-player')).toBeNull();
  });

  it('Poster zeigt Titel + Hinweis "Klick zum Abspielen"', () => {
    const fixture = setup([mkMember()]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const poster = el.querySelector('.video-poster');
    expect(poster?.textContent).toContain('Tanzschulfilm');
    expect(poster?.textContent).toContain('Klick zum Abspielen');
    expect(poster?.getAttribute('aria-label')).toContain('abspielen');
  });

  it('Klick auf Poster setzt videoLoaded=true und rendert <video>', () => {
    const fixture = setup([mkMember()]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('.video-poster') as HTMLButtonElement).click();
    fixture.detectChanges();
    const video = el.querySelector('video.video-player') as HTMLVideoElement | null;
    expect(video).not.toBeNull();
    expect(video!.getAttribute('src')).toBe(
      'https://video.tsfaf.de/v2/Webseite/Tanzschulfilm.mp4',
    );
    expect(video!.hasAttribute('controls')).toBe(true);
    expect(video!.hasAttribute('autoplay')).toBe(true);
    expect(video!.hasAttribute('playsinline')).toBe(true);
    expect(video!.getAttribute('preload')).toBe('metadata');
    // Poster ist nach Klick weg
    expect(el.querySelector('.video-poster')).toBeNull();
  });

  // ─── Partner-Logos ──────────────────────────────────────────────

  it('rendert die Partner-Logos rechts in der Intro-Section', () => {
    const fixture = setup([mkMember()]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const items = el.querySelectorAll('.partner-grid .partner-item');
    expect(items.length).toBe(6);
  });

  it('Partner werden in der korrekten Reihenfolge gerendert', () => {
    const fixture = setup([mkMember()]);
    fixture.detectChanges();
    const hrefs = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>(
        '.partner-link',
      ),
    ).map(a => a.getAttribute('href') ?? '');

    // Reihenfolge: ADTV → Agilando → Dance4Fans → Dadanza → Kanga → Zumba
    expect(hrefs[0]).toContain('adtv.de');
    expect(hrefs[1]).toContain('tanzen.de/agilando');
    expect(hrefs[2]).toContain('dance4fans.de');
    expect(hrefs[3]).toContain('dadanza.de');
    expect(hrefs[4]).toContain('kangatraining.info');
    expect(hrefs[5]).toContain('zumba.com');
  });

  it('jeder Partner-Link oeffnet im neuen Tab mit rel="noopener noreferrer"', () => {
    const fixture = setup([mkMember()]);
    fixture.detectChanges();
    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>(
        '.partner-link',
      ),
    );
    expect(links.length).toBe(6);
    for (const a of links) {
      expect(a.getAttribute('target')).toBe('_blank');
      expect(a.getAttribute('rel')).toContain('noopener');
      expect(a.getAttribute('rel')).toContain('noreferrer');
      expect(a.getAttribute('href')).toBeTruthy();
    }
  });

  it('Partner-Logos haben alt-Text und lazy loading', () => {
    const fixture = setup([mkMember()]);
    fixture.detectChanges();
    const imgs = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLImageElement>(
        '.partner-logo',
      ),
    );
    expect(imgs.length).toBe(6);
    for (const img of imgs) {
      expect(img.getAttribute('alt')).toBeTruthy();
      expect(img.getAttribute('loading')).toBe('lazy');
    }
  });

  it('"Tanzschule in Zahlen" Stat-Block wurde entfernt', () => {
    const fixture = setup([mkMember()]);
    fixture.detectChanges();
    const txt = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(txt).not.toContain('Tanzschule in Zahlen');
    expect(txt).toContain('Unsere Partner');
  });
});
