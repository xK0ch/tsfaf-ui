import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { extractRoles, mapTeamMember, TeamStore } from './ueber-uns-data';
import type { JoomlaArticle } from '../../core/models/joomla.models';
import { environment } from '../../../environments/environment';

// ─── Helpers ──────────────────────────────────────────────────────

function mkJoomlaArticle(over: Partial<JoomlaArticle> = {}): JoomlaArticle {
  return {
    id: '1',
    title: 'Max Mustermann',
    alias: 'max-mustermann',
    state: 1,
    text: '<p>Body</p>',
    created: '2026-01-01 10:00:00',
    modified: '2026-01-01 10:00:00',
    publish_up: null,
    publish_down: null,
    language: '*',
    featured: 0,
    images: {},
    categoryId: '13',
    tagIds: [],
    ...over,
  };
}

// ─── extractRoles ─────────────────────────────────────────────────

describe('extractRoles', () => {
  it('extrahiert Bullet-Liste in Reihenfolge', () => {
    const html = '<ul><li>ADTV-Tanzlehrerin</li><li>ZUMBA-Instructor</li></ul>';
    expect(extractRoles(html)).toEqual(['ADTV-Tanzlehrerin', 'ZUMBA-Instructor']);
  });

  it('strippt verschachtelte Tags innerhalb der li', () => {
    const html = '<ul><li><strong>ADTV</strong>-Tanzlehrerin</li></ul>';
    expect(extractRoles(html)).toEqual(['ADTV -Tanzlehrerin']);
  });

  it('faellt auf <p>-Absaetze zurueck wenn keine Liste', () => {
    const html = '<p>Service Team</p><p>Empfang</p>';
    expect(extractRoles(html)).toEqual(['Service Team', 'Empfang']);
  });

  it('faellt auf Plain-Text-Zeilen zurueck wenn weder ul noch p', () => {
    const html = 'Eins\nZwei\nDrei';
    expect(extractRoles(html)).toEqual(['Eins', 'Zwei', 'Drei']);
  });

  it('liefert leeres Array bei leerem Input', () => {
    expect(extractRoles('')).toEqual([]);
    expect(extractRoles('   ')).toEqual([]);
  });

  it('filtert leere li-Eintraege raus', () => {
    const html = '<ul><li>Rolle</li><li>  </li><li></li></ul>';
    expect(extractRoles(html)).toEqual(['Rolle']);
  });
});

// ─── mapTeamMember ────────────────────────────────────────────────

describe('mapTeamMember', () => {
  it('mapped Standardfelder aus Joomla-Article', () => {
    const m = mapTeamMember(
      mkJoomlaArticle({
        id: '42',
        title: 'Tabea Höftmann',
        text: '<ul><li>ADTV-Tanzlehrerin</li><li>Kindertanzlehrerin</li></ul>',
      }),
    );
    expect(m.id).toBe('42');
    expect(m.name).toBe('Tabea Höftmann');
    expect(m.role).toBe('ADTV-Tanzlehrerin');
    expect(m.qualifications).toEqual(['Kindertanzlehrerin']);
  });

  it('role ist leer wenn Body leer', () => {
    const m = mapTeamMember(mkJoomlaArticle({ text: '' }));
    expect(m.role).toBe('');
    expect(m.qualifications).toEqual([]);
  });

  it('role = einziger Bullet wenn nur einer existiert', () => {
    const m = mapTeamMember(
      mkJoomlaArticle({ text: '<ul><li>Service Team</li></ul>' }),
    );
    expect(m.role).toBe('Service Team');
    expect(m.qualifications).toEqual([]);
  });

  it('imageUrl null wenn kein Foto', () => {
    const m = mapTeamMember(mkJoomlaArticle());
    expect(m.imageUrl).toBeNull();
  });

  it('imageUrl mit gestrippter Joomla-Metadata, absolut gemacht', () => {
    const m = mapTeamMember(
      mkJoomlaArticle({
        images: {
          image_intro:
            'images/team/uwe.jpg#joomlaImage://local-images/team/uwe.jpg?w=400&h=500',
        },
      }),
    );
    expect(m.imageUrl).toBe(`${environment.joomlaImageBase}/images/team/uwe.jpg`);
  });

  it('imageAlt aus Joomla, sonst "Foto von <Name>" als Fallback', () => {
    const explicit = mapTeamMember(
      mkJoomlaArticle({
        title: 'Uwe Höftmann',
        images: {
          image_intro: 'images/team/uwe.jpg',
          image_intro_alt: 'Uwe lacht in die Kamera',
        },
      }),
    );
    expect(explicit.imageAlt).toBe('Uwe lacht in die Kamera');

    const fallback = mapTeamMember(
      mkJoomlaArticle({
        title: 'Uwe Höftmann',
        images: { image_intro: 'images/team/uwe.jpg' },
      }),
    );
    expect(fallback.imageAlt).toBe('Foto von Uwe Höftmann');
  });
});

// ─── TeamStore ────────────────────────────────────────────────────

describe('TeamStore', () => {
  let http: HttpTestingController;
  const BASE = environment.joomlaApiBase;

  function setupStore(): TeamStore {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TeamStore,
      ],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(TeamStore);
  }

  afterEach(() => {
    http.verify();
  });

  function expectArticlesRequest() {
    const req = http.expectOne(r => r.url === `${BASE}/content/articles`);
    expect(req.request.method).toBe('GET');
    return req;
  }

  function mkResource(id: string, attrs: Partial<JoomlaArticle> = {}) {
    return {
      type: 'article',
      id,
      attributes: {
        id: Number(id),
        title: 'T',
        alias: `a-${id}`,
        state: 1,
        access: 1,
        created: '2026-01-01 10:00:00',
        modified: '2026-01-01 10:00:00',
        publish_up: null,
        publish_down: null,
        featured: 0,
        language: '*',
        text: '<ul><li>Rolle</li></ul>',
        ...attrs,
      },
    };
  }

  it('feuert Request mit Sort-Params nach ordering ASC', () => {
    setupStore();
    const req = expectArticlesRequest();
    expect(req.request.params.get('filter[category]')).toBe(
      String(environment.joomlaCategoryTeam),
    );
    expect(req.request.params.get('list[ordering]')).toBe('ordering');
    expect(req.request.params.get('list[direction]')).toBe('asc');
    req.flush({ data: [] });
  });

  it('loading() ist vor Flush true, danach false', () => {
    const store = setupStore();
    expect(store.loading()).toBe(true);
    expectArticlesRequest().flush({ data: [] });
    expect(store.loading()).toBe(false);
  });

  it('respektiert die Reihenfolge aus der API-Response (kein Re-Sort client-seitig)', () => {
    const store = setupStore();
    // Joomla liefert in serverseitig sortierter Reihenfolge zurueck.
    // Der Store darf das NICHT mehr umsortieren — sonst wuerde Drag&Drop
    // im Backend nichts bewirken.
    expectArticlesRequest().flush({
      data: [
        mkResource('210', { title: 'Uwe' }),
        mkResource('211', { title: 'Tabea' }),
        mkResource('212', { title: 'Alena' }),
      ],
    });
    expect(store.members()?.map(m => m.name)).toEqual(['Uwe', 'Tabea', 'Alena']);
  });

  it('liefert leeres Array bei leerer Response', () => {
    const store = setupStore();
    expectArticlesRequest().flush({ data: [] });
    expect(store.members()).toEqual([]);
  });
});
