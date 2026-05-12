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
    expect(el.querySelector('.team-status')?.textContent).toContain(
      'Team wird geladen',
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

  it('Team-Section steht VOR Raeumlichkeiten und VOR Werte', () => {
    const fixture = setup([mkMember()]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const teamSec = el.querySelector('#team');
    const roomsSec = el.querySelector('#raeumlichkeiten');
    const valuesSec = el.querySelector('#werte');

    expect(teamSec).not.toBeNull();
    expect(roomsSec).not.toBeNull();
    expect(valuesSec).not.toBeNull();

    // DOCUMENT_POSITION_FOLLOWING = 4 → other follows this
    expect(teamSec!.compareDocumentPosition(roomsSec!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(roomsSec!.compareDocumentPosition(valuesSec!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
});
