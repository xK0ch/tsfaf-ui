import { TestBed } from '@angular/core/testing';

import { TeamCard } from './team-card';
import type { TeamMember } from '../ueber-uns-data';

function mkMember(over: Partial<TeamMember> = {}): TeamMember {
  return {
    id: 't-1',
    name: 'Max Mustermann',
    role: 'ADTV-Tanzlehrer',
    qualifications: [],
    imageUrl: null,
    imageAlt: '',
    ...over,
  };
}

describe('TeamCard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TeamCard] });
  });

  function setup(member: TeamMember) {
    const fixture = TestBed.createComponent(TeamCard);
    fixture.componentRef.setInput('member', member);
    fixture.detectChanges();
    return fixture;
  }

  // ─── Rendering: Image vs. Initials ──────────────────────────────

  it('rendert <img> als klickbaren Button wenn imageUrl gesetzt', () => {
    const fixture = setup(
      mkMember({
        name: 'Tabea Höftmann',
        imageUrl: 'https://example.com/tabea.jpg',
        imageAlt: 'Foto von Tabea',
      }),
    );
    const el = fixture.nativeElement as HTMLElement;
    const button = el.querySelector('.team-photo-clickable') as HTMLButtonElement | null;
    expect(button).not.toBeNull();
    const img = button!.querySelector('img') as HTMLImageElement;
    expect(img.src).toBe('https://example.com/tabea.jpg');
    expect(img.alt).toBe('Foto von Tabea');
  });

  it('rendert Initials-Avatar wenn imageUrl null', () => {
    const fixture = setup(mkMember({ name: 'Tabea Höftmann', imageUrl: null }));
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.team-photo-clickable')).toBeNull();
    const initials = el.querySelector('.team-photo-initials');
    expect(initials).not.toBeNull();
    expect(initials!.textContent).toContain('TH');
  });

  it('Initials: Erst- + Letztwort-Buchstaben, uppercase', () => {
    const cases: ReadonlyArray<[string, string]> = [
      ['Tabea Höftmann', 'TH'],
      ['uwe höftmann', 'UH'],
      ['Max', 'M'],
      ['', '?'],
      ['Anna Maria Schmidt', 'AS'], // erstes + letztes Wort
    ];
    for (const [name, expected] of cases) {
      const fixture = setup(mkMember({ name }));
      const el = fixture.nativeElement as HTMLElement;
      const initialsEl = el.querySelector('.team-initials');
      expect(initialsEl?.textContent?.trim()).toBe(expected);
    }
  });

  // ─── Info-Bereich ───────────────────────────────────────────────

  it('rendert Namen', () => {
    const fixture = setup(mkMember({ name: 'Tabea Höftmann' }));
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.team-name')?.textContent).toContain('Tabea Höftmann');
  });

  it('rendert role wenn gesetzt, sonst nicht', () => {
    const withRole = setup(mkMember({ role: 'Service Team' }));
    expect(
      (withRole.nativeElement as HTMLElement).querySelector('.team-role')?.textContent,
    ).toContain('Service Team');

    const withoutRole = setup(mkMember({ role: '' }));
    expect(
      (withoutRole.nativeElement as HTMLElement).querySelector('.team-role'),
    ).toBeNull();
  });

  it('rendert Qualifikations-Tags wenn vorhanden', () => {
    const fixture = setup(
      mkMember({
        qualifications: ['ZUMBA-Instructor', 'HipHop-Instructor', 'Kanga-Trainerin'],
      }),
    );
    const tags = (fixture.nativeElement as HTMLElement).querySelectorAll('.qual-tag');
    expect(tags.length).toBe(3);
    expect(tags[0].textContent).toContain('ZUMBA-Instructor');
    expect(tags[2].textContent).toContain('Kanga-Trainerin');
  });

  it('rendert die Quals-Liste nicht wenn leer', () => {
    const fixture = setup(mkMember({ qualifications: [] }));
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.team-quals'),
    ).toBeNull();
  });

  // ─── Lightbox ───────────────────────────────────────────────────

  it('rendert ein <dialog> wenn imageUrl gesetzt', () => {
    const fixture = setup(
      mkMember({ imageUrl: 'https://example.com/tabea.jpg', name: 'Tabea' }),
    );
    const dialog = (fixture.nativeElement as HTMLElement).querySelector(
      'dialog.team-lightbox',
    );
    expect(dialog).not.toBeNull();
  });

  it('rendert KEIN <dialog> wenn imageUrl null (kein zoomable Foto)', () => {
    const fixture = setup(mkMember({ imageUrl: null }));
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('dialog.team-lightbox'),
    ).toBeNull();
  });

  it('Foto-Button hat aria-label mit Namen fuer Screenreader', () => {
    const fixture = setup(
      mkMember({ name: 'Tabea Höftmann', imageUrl: 'https://example.com/t.jpg' }),
    );
    const button = (fixture.nativeElement as HTMLElement).querySelector(
      '.team-photo-clickable',
    ) as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toContain('Tabea Höftmann');
    expect(button.getAttribute('aria-label')).toMatch(/vergr/i);
  });

  it('onBackdropClick schliesst NUR wenn target===currentTarget', () => {
    const fixture = setup(
      mkMember({ imageUrl: 'https://example.com/t.jpg', name: 'Tabea' }),
    );
    const cmp = fixture.componentInstance as unknown as {
      onBackdropClick(e: MouseEvent): void;
    };
    // Stub die close-Methode am Dialog so dass wir messen koennen ob's
    // aufgerufen wurde, ohne das echte showModal/close-Lifecycle zu
    // brauchen (jsdom-Eigenheiten).
    const dialog = (fixture.nativeElement as HTMLElement).querySelector(
      'dialog.team-lightbox',
    ) as HTMLDialogElement;
    let closeCalls = 0;
    dialog.close = () => {
      closeCalls++;
    };

    // Klick auf inneres Element (target !== currentTarget) → nicht schliessen
    const innerEl = dialog.querySelector('.team-lightbox-inner') as HTMLElement;
    cmp.onBackdropClick({ target: innerEl, currentTarget: dialog } as unknown as MouseEvent);
    expect(closeCalls).toBe(0);

    // Klick auf Dialog selbst (target === currentTarget) → schliessen
    cmp.onBackdropClick({ target: dialog, currentTarget: dialog } as unknown as MouseEvent);
    expect(closeCalls).toBe(1);
  });
});
