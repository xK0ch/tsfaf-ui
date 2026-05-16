import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, EMPTY, Observable } from 'rxjs';

import { Veranstaltungen } from './veranstaltungen';
import {
  VeranstaltungenStore,
  type VeranstaltungItem,
} from './veranstaltungen-data';

function mkEvent(over: Partial<VeranstaltungItem> = {}): VeranstaltungItem {
  return {
    id: 'e-1',
    slug: 'discofox-workshop',
    title: 'Discofox-Workshop',
    type: 'workshop',
    typeLabel: 'Workshop',
    tagClass: 'tag-primary',
    date: new Date('2026-06-06T00:00:00'),
    day: 6,
    monthShort: 'Jun',
    dateLabel: 'Samstag, 6. Juni 2026',
    monthKey: 'Juni 2026',
    past: false,
    timeRanges: [],
    timeSummary: '19:00 - 21:00 Uhr',
    start: new Date('2026-06-06T19:00:00'),
    end: new Date('2026-06-06T21:00:00'),
    price: '15 €',
    priceCard: '10 €',
    requiresRegistration: true,
    bodyHtml: '<p>Body</p>',
    excerpt: 'Excerpt',
    ...over,
  };
}

function makeStoreMock(initial: readonly VeranstaltungItem[] | null) {
  const events = signal<readonly VeranstaltungItem[] | null>(initial);
  return {
    events,
    loading: computed(() => events() === null),
    availableTypes: computed<readonly { key: string; label: string }[]>(() => {
      const all = events() ?? [];
      const seen = new Map<string, string>();
      for (const ev of all) {
        if (!seen.has(ev.type)) {
          seen.set(ev.type, ev.typeLabel);
        }
      }
      return Array.from(seen.entries())
        .map(([key, label]) => ({ key, label }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }),
  };
}

interface RouterSpy {
  navigate: (cmds: unknown[], extras?: unknown) => Promise<boolean>;
  events: Observable<never>;
  createUrlTree: () => null;
  serializeUrl: () => string;
  navigateCalls: { cmds: unknown[]; extras: unknown }[];
}

function makeRouterSpy(): RouterSpy {
  const calls: { cmds: unknown[]; extras: unknown }[] = [];
  return {
    navigate: (cmds: unknown[], extras?: unknown): Promise<boolean> => {
      calls.push({ cmds, extras });
      return Promise.resolve(true);
    },
    // RouterLink + RouterLinkActive (im EventDetailPanel) subscriben sich
    // auf router.events. EMPTY reicht — wir testen die Navigation ueber
    // die navigateCalls direkt.
    events: EMPTY,
    createUrlTree: () => null,
    serializeUrl: () => '',
    get navigateCalls() {
      return calls;
    },
  };
}

function makeRoute(opts: { event?: string; typ?: string } = {}) {
  const initial: Record<string, string> = {};
  if (opts.event) initial['event'] = opts.event;
  if (opts.typ) initial['typ'] = opts.typ;
  const params$ = new BehaviorSubject(convertToParamMap(initial));
  return {
    queryParamMap: params$.asObservable(),
  };
}

describe('Veranstaltungen', () => {
  function setup(opts: {
    events?: readonly VeranstaltungItem[] | null;
    initialEventSlug?: string;
    initialTyp?: string;
  } = {}) {
    // 'in opts' damit explicit null nicht durch ?? zu [] wird.
    const events = 'events' in opts ? opts.events ?? null : [];
    const storeMock = makeStoreMock(events);
    const routerSpy = makeRouterSpy();
    const route = makeRoute({
      event: opts.initialEventSlug,
      typ: opts.initialTyp,
    });
    TestBed.configureTestingModule({
      imports: [Veranstaltungen],
      providers: [
        { provide: VeranstaltungenStore, useValue: storeMock },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: route },
      ],
    });
    const fixture = TestBed.createComponent(Veranstaltungen);
    return { fixture, storeMock, routerSpy, route };
  }

  // ─── Loading / Empty / Render ───────────────────────────────────

  it('zeigt Loading-Status solange Store laedt', () => {
    const { fixture } = setup({ events: null });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.ev-status')?.textContent).toContain(
      'Veranstaltungen werden geladen',
    );
  });

  it('zeigt Empty-State wenn keine Events da sind', () => {
    const { fixture } = setup({ events: [] });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.state-box')).not.toBeNull();
  });

  it('rendert Events nach Monaten gruppiert', () => {
    const { fixture } = setup({
      events: [
        mkEvent({ id: '1', slug: 'a', monthKey: 'Juni 2026', start: new Date('2026-06-06T19:00:00') }),
        mkEvent({ id: '2', slug: 'b', monthKey: 'Juli 2026', start: new Date('2026-07-04T19:00:00') }),
      ],
    });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.month-group').length).toBe(2);
  });

  // ─── Filter ─────────────────────────────────────────────────────

  it('rendert Filter-Chips dynamisch aus Daten + "Alle"', () => {
    const { fixture } = setup({
      events: [
        mkEvent({ id: '1', type: 'workshop', typeLabel: 'Workshop' }),
        mkEvent({ id: '2', type: 'tanzparty', typeLabel: 'Tanzparty' }),
      ],
    });
    fixture.detectChanges();
    const chips = (fixture.nativeElement as HTMLElement).querySelectorAll('.filter-chip');
    const labels = Array.from(chips).map(c => c.textContent?.trim());
    expect(labels).toEqual(['Alle', 'Tanzparty', 'Workshop']);
  });

  // ─── Multi-Select Typ-Filter ────────────────────────────────────

  it('toggleFilter: setzt typ-Param mit einem Slug', () => {
    const { fixture, routerSpy } = setup({
      events: [mkEvent({ type: 'workshop' })],
    });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      toggleFilter(k: string): void;
    };
    cmp.toggleFilter('workshop');
    const extras = routerSpy.navigateCalls[0].extras as {
      queryParams: { typ: string };
      replaceUrl: boolean;
    };
    expect(extras.queryParams.typ).toBe('workshop');
    expect(extras.replaceUrl).toBe(true);
  });

  it('toggleFilter: zweiter Typ wird hinzugefuegt, alphabetisch sortiert', () => {
    const { fixture, routerSpy } = setup({
      events: [mkEvent({ type: 'workshop' }), mkEvent({ type: 'tanzparty' })],
      initialTyp: 'workshop',
    });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      toggleFilter(k: string): void;
    };
    cmp.toggleFilter('tanzparty');
    const extras = routerSpy.navigateCalls[0].extras as {
      queryParams: { typ: string };
    };
    expect(extras.queryParams.typ).toBe('tanzparty,workshop');
  });

  it('toggleFilter: aktiven Typ wegklicken entfernt ihn', () => {
    const { fixture, routerSpy } = setup({
      events: [mkEvent({ type: 'workshop' }), mkEvent({ type: 'tanzparty' })],
      initialTyp: 'tanzparty,workshop',
    });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      toggleFilter(k: string): void;
    };
    cmp.toggleFilter('workshop');
    const extras = routerSpy.navigateCalls[0].extras as {
      queryParams: { typ: string };
    };
    expect(extras.queryParams.typ).toBe('tanzparty');
  });

  it('toggleFilter: letzten aktiven Typ wegklicken -> typ-Param null', () => {
    const { fixture, routerSpy } = setup({
      events: [mkEvent({ type: 'workshop' })],
      initialTyp: 'workshop',
    });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      toggleFilter(k: string): void;
    };
    cmp.toggleFilter('workshop');
    const extras = routerSpy.navigateCalls[0].extras as {
      queryParams: { typ: string | null };
    };
    expect(extras.queryParams.typ).toBeNull();
  });

  it('clearFilters: leert die typ-Liste', () => {
    const { fixture, routerSpy } = setup({
      events: [mkEvent({ type: 'workshop' }), mkEvent({ type: 'tanzparty' })],
      initialTyp: 'tanzparty,workshop',
    });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as { clearFilters(): void };
    cmp.clearFilters();
    const extras = routerSpy.navigateCalls[0].extras as {
      queryParams: { typ: string | null };
    };
    expect(extras.queryParams.typ).toBeNull();
  });

  it('filtered: ohne Param == alle Events sichtbar (nicht-past)', () => {
    const { fixture } = setup({
      events: [
        mkEvent({ id: '1', type: 'workshop' }),
        mkEvent({ id: '2', type: 'tanzparty' }),
      ],
    });
    fixture.detectChanges();
    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('.ev-card');
    expect(cards.length).toBe(2);
  });

  it('filtered: einzelner Typ-Filter', () => {
    const { fixture } = setup({
      events: [
        mkEvent({ id: '1', type: 'workshop' }),
        mkEvent({ id: '2', type: 'tanzparty' }),
      ],
      initialTyp: 'workshop',
    });
    fixture.detectChanges();
    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('.ev-card');
    expect(cards.length).toBe(1);
  });

  it('filtered: mehrfacher Typ-Filter zeigt alle matchenden', () => {
    const { fixture } = setup({
      events: [
        mkEvent({ id: '1', type: 'workshop' }),
        mkEvent({ id: '2', type: 'tanzparty' }),
        mkEvent({ id: '3', type: 'just-dance' }),
      ],
      initialTyp: 'tanzparty,workshop',
    });
    fixture.detectChanges();
    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('.ev-card');
    expect(cards.length).toBe(2);
  });

  it('"Alle"-Chip ist aktiv wenn kein Filter gesetzt', () => {
    const { fixture } = setup({ events: [mkEvent()] });
    fixture.detectChanges();
    const alleChip = (fixture.nativeElement as HTMLElement).querySelector(
      '.filter-chip',
    ) as HTMLButtonElement;
    expect(alleChip.textContent?.trim()).toBe('Alle');
    expect(alleChip.classList.contains('active')).toBe(true);
  });

  it('"Alle"-Chip ist inaktiv wenn mindestens ein Filter gesetzt', () => {
    const { fixture } = setup({
      events: [mkEvent({ type: 'workshop' })],
      initialTyp: 'workshop',
    });
    fixture.detectChanges();
    const alleChip = (fixture.nativeElement as HTMLElement).querySelector(
      '.filter-chip',
    ) as HTMLButtonElement;
    expect(alleChip.classList.contains('active')).toBe(false);
  });

  // ─── URL-Sync ───────────────────────────────────────────────────

  it('oeffnet Detail-Panel automatisch wenn URL ?event=<slug> beim Laden enthaelt', () => {
    const { fixture } = setup({
      events: [mkEvent({ slug: 'tanz-in-den-mai', title: 'Tanz in den Mai' })],
      initialEventSlug: 'tanz-in-den-mai',
    });
    fixture.detectChanges();
    const panel = (fixture.nativeElement as HTMLElement).querySelector(
      'app-event-detail-panel',
    );
    expect(panel).not.toBeNull();
  });

  it('oeffnet KEIN Panel wenn slug nicht zu Daten passt', () => {
    const { fixture } = setup({
      events: [mkEvent({ slug: 'a' })],
      initialEventSlug: 'b',
    });
    fixture.detectChanges();
    const panel = (fixture.nativeElement as HTMLElement).querySelector(
      'app-event-detail-panel',
    );
    expect(panel).toBeNull();
  });

  it('openDetail navigiert mit queryParams', () => {
    const { fixture, routerSpy } = setup({
      events: [mkEvent({ slug: 'workshop' })],
    });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      openDetail(e: VeranstaltungItem): void;
    };
    cmp.openDetail(mkEvent({ slug: 'workshop' }));
    expect(routerSpy.navigateCalls.length).toBe(1);
    const extras = routerSpy.navigateCalls[0].extras as {
      queryParams: { event: string };
      queryParamsHandling: string;
    };
    expect(extras.queryParams).toEqual({ event: 'workshop' });
    expect(extras.queryParamsHandling).toBe('merge');
  });

  it('closeDetail navigiert mit event=null (Param wird entfernt)', () => {
    const { fixture, routerSpy } = setup({ events: [mkEvent()] });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as { closeDetail(): void };
    cmp.closeDetail();
    expect(routerSpy.navigateCalls.length).toBe(1);
    const extras = routerSpy.navigateCalls[0].extras as {
      queryParams: { event: string | null };
    };
    expect(extras.queryParams.event).toBeNull();
  });
});
