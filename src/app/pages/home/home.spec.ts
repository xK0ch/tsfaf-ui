import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Home } from './home';
import { NewsStore, type NewsArticle } from '../neuigkeiten/neuigkeiten-data';
import {
  VeranstaltungenStore,
  type VeranstaltungItem,
} from '../veranstaltungen/veranstaltungen-data';

function mkArticle(over: Partial<NewsArticle> = {}): NewsArticle {
  return {
    id: '1',
    slug: 'foo',
    title: 'Foo',
    date: new Date('2026-01-01T00:00:00Z'),
    dateLong: '01. Januar 2026',
    dateShort: 'Jan 26',
    excerpt: 'Excerpt',
    bodyHtml: '<p>Body</p>',
    imageUrl: null,
    imageAlt: 'Foo',
    imageCaption: null,
    ...over,
  };
}

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
    teilnahme: 'voranmeldung',
    bodyHtml: '<p>Body</p>',
    excerpt: 'Excerpt',
    ...over,
  };
}

function makeNewsStoreMock(initial: readonly NewsArticle[] | null) {
  const articles = signal<readonly NewsArticle[] | null>(initial);
  return {
    articles,
    loading: computed(() => articles() === null),
    bySlug: () => null,
  };
}

function makeEventsStoreMock(initial: readonly VeranstaltungItem[] | null) {
  const events = signal<readonly VeranstaltungItem[] | null>(initial);
  return {
    events,
    loading: computed(() => events() === null),
    availableTypes: computed(() => []),
  };
}

describe('Home', () => {
  function setup(opts: {
    articles?: readonly NewsArticle[] | null;
    events?: readonly VeranstaltungItem[] | null;
  } = {}) {
    // 'in opts' damit explicit `null` (=Loading) nicht durch `??` zu `[]` wird.
    const articles = 'articles' in opts ? opts.articles ?? null : [];
    const events = 'events' in opts ? opts.events ?? null : [];
    TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        { provide: NewsStore, useValue: makeNewsStoreMock(articles) },
        { provide: VeranstaltungenStore, useValue: makeEventsStoreMock(events) },
      ],
    });
    return TestBed.createComponent(Home);
  }

  // ─── News-Section ───────────────────────────────────────────────

  it('zeigt News-Loading wenn NewsStore noch null', () => {
    const fixture = setup({ articles: null });
    fixture.detectChanges();
    const news = (fixture.nativeElement as HTMLElement).querySelector('.section-news');
    expect(news?.textContent).toContain('Wird geladen');
  });

  it('zeigt News-Empty wenn keine Artikel da', () => {
    const fixture = setup({ articles: [] });
    fixture.detectChanges();
    const news = (fixture.nativeElement as HTMLElement).querySelector('.section-news');
    expect(news?.textContent).toContain('keine Beiträge online');
  });

  it('zeigt maximal 3 News-Cards', () => {
    const fixture = setup({
      articles: Array.from({ length: 8 }, (_, i) =>
        mkArticle({ id: String(i + 1), slug: `n-${i + 1}`, title: `News ${i + 1}` }),
      ),
    });
    fixture.detectChanges();
    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('.section-news .news-card');
    expect(cards.length).toBe(3);
  });

  it('verlinkt jede News-Card direkt auf die Detail-Page', () => {
    const fixture = setup({
      articles: [mkArticle({ id: '1', slug: 'parken', title: 'Parken' })],
    });
    fixture.detectChanges();
    const link = (fixture.nativeElement as HTMLElement).querySelector(
      '.section-news .news-card',
    ) as HTMLAnchorElement | null;
    expect(link?.getAttribute('href')).toContain('/neuigkeiten/parken');
  });

  // ─── Events-Section ─────────────────────────────────────────────

  it('zeigt Events-Loading wenn EventsStore noch null', () => {
    const fixture = setup({ events: null });
    fixture.detectChanges();
    const evSec = (fixture.nativeElement as HTMLElement).querySelector('.section-events');
    expect(evSec?.textContent).toContain('Veranstaltungen werden geladen');
  });

  it('zeigt Events-Empty wenn keine kommenden Veranstaltungen', () => {
    const fixture = setup({ events: [] });
    fixture.detectChanges();
    const evSec = (fixture.nativeElement as HTMLElement).querySelector('.section-events');
    expect(evSec?.textContent).toContain('keine kommenden Veranstaltungen');
  });

  it('filtert vergangene Events aus dem Teaser raus', () => {
    const fixture = setup({
      events: [
        mkEvent({ id: '1', slug: 'past', past: true }),
        mkEvent({ id: '2', slug: 'future', past: false }),
      ],
    });
    fixture.detectChanges();
    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('.section-events .event-card');
    expect(cards.length).toBe(1);
    const link = (fixture.nativeElement as HTMLElement).querySelector(
      '.section-events .event-card a[href]',
    ) as HTMLAnchorElement | null;
    expect(link?.getAttribute('href')).toContain('future');
  });

  it('zeigt maximal 3 Event-Cards, sortiert nach Startdatum aufsteigend', () => {
    const fixture = setup({
      events: [
        mkEvent({ id: '1', slug: 'c', start: new Date('2026-08-01T19:00:00') }),
        mkEvent({ id: '2', slug: 'a', start: new Date('2026-05-01T19:00:00') }),
        mkEvent({ id: '3', slug: 'd', start: new Date('2026-09-01T19:00:00') }),
        mkEvent({ id: '4', slug: 'b', start: new Date('2026-06-01T19:00:00') }),
        mkEvent({ id: '5', slug: 'e', start: new Date('2026-10-01T19:00:00') }),
      ],
    });
    fixture.detectChanges();
    const links = (fixture.nativeElement as HTMLElement).querySelectorAll(
      '.section-events .event-card a[href]',
    );
    expect(links.length).toBe(3);
    expect(links[0].getAttribute('href')).toContain('a');
    expect(links[1].getAttribute('href')).toContain('b');
    expect(links[2].getAttribute('href')).toContain('c');
  });

  it('Event-Card verlinkt mit queryParam event=<slug>', () => {
    const fixture = setup({
      events: [mkEvent({ id: '1', slug: 'tanz-in-den-mai' })],
    });
    fixture.detectChanges();
    const link = (fixture.nativeElement as HTMLElement).querySelector(
      '.section-events .event-card a[href]',
    ) as HTMLAnchorElement | null;
    expect(link?.getAttribute('href')).toContain('/veranstaltungen');
    expect(link?.getAttribute('href')).toContain('event=tanz-in-den-mai');
  });

  // ─── Hero-Video ────────────────────────────────────────────────

  it('rendert ein Video-Element im Hero mit Loop + Autoplay + Inline-Playback', () => {
    const fixture = setup();
    fixture.detectChanges();
    const video = (fixture.nativeElement as HTMLElement).querySelector(
      '.hero-video',
    ) as HTMLVideoElement | null;
    expect(video).not.toBeNull();
    expect(video!.getAttribute('src')).toBe(
      'https://video.tsfaf.de/v2/Webseite/Homepagevideo.mp4',
    );
    expect(video!.hasAttribute('autoplay')).toBe(true);
    expect(video!.hasAttribute('loop')).toBe(true);
    expect(video!.hasAttribute('playsinline')).toBe(true);
    expect(video!.getAttribute('aria-hidden')).toBe('true');
  });

  it('Video-Element ist via Property-Binding stumm (kritisch fuer Browser-Autoplay-Policy)', () => {
    const fixture = setup();
    fixture.detectChanges();
    const video = (fixture.nativeElement as HTMLElement).querySelector(
      '.hero-video',
    ) as HTMLVideoElement;
    expect(video.muted).toBe(true);
  });

  it('playHeroVideo() ruft play() auf das Video und faengt Rejection silent ab', async () => {
    const fixture = setup();
    fixture.detectChanges();
    const video = (fixture.nativeElement as HTMLElement).querySelector(
      '.hero-video',
    ) as HTMLVideoElement;

    let playCalls = 0;
    let mutedSetToTrue = false;
    // Stub play() + den muted-Setter, damit wir das Verhalten von
    // playHeroVideo() pruefen koennen ohne echte Media-Decoder.
    Object.defineProperty(video, 'muted', {
      configurable: true,
      get: () => true,
      set: (v: boolean) => { if (v) mutedSetToTrue = true; },
    });
    video.play = () => {
      playCalls++;
      // Browser-block-Simulation: Promise rejected.
      return Promise.reject(new DOMException('autoplay blocked', 'NotAllowedError'));
    };

    const cmp = fixture.componentInstance as unknown as { playHeroVideo(): void };
    cmp.playHeroVideo();

    expect(mutedSetToTrue).toBe(true);
    expect(playCalls).toBe(1);
    // Microtask warten, damit die Rejection durch ist, dann darf
    // nichts unhandelt geworfen sein (sonst wuerde Vitest motzen).
    await Promise.resolve();
  });

  // ─── Sonstiges ──────────────────────────────────────────────────

  it('Gutschein-Band-Section wurde komplett entfernt', () => {
    const fixture = setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.section-gutschein')).toBeNull();
  });

  it('Section-Reihenfolge: Hero, Zielgruppen, News, Events, Kontakt-Strip', () => {
    const fixture = setup({ articles: [mkArticle()], events: [mkEvent()] });
    fixture.detectChanges();
    const sections = (fixture.nativeElement as HTMLElement).querySelectorAll('section');
    expect(sections[0]?.classList.contains('hero')).toBe(true);
    expect(sections[1]?.classList.contains('section-zielgruppen')).toBe(true);
    expect(sections[2]?.classList.contains('section-news')).toBe(true);
    expect(sections[3]?.classList.contains('section-events')).toBe(true);
    expect(sections[4]?.classList.contains('section-kontakt-strip')).toBe(true);
  });

  it('Zielgruppen-Cards sind Buttons (kein direktes <a href>)', () => {
    const fixture = setup();
    fixture.detectChanges();
    const cards = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.zg-card'),
    );
    expect(cards.length).toBe(4);
    for (const c of cards) {
      expect(c.tagName).toBe('BUTTON');
      expect(c.getAttribute('aria-expanded')).toBe('false');
    }
  });

  it('Initial ist kein Detail-Panel sichtbar', () => {
    const fixture = setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.zg-detail')).toBeNull();
  });

  it('Klick auf Card oeffnet Detail-Panel mit Langtext + CTA, aria-expanded=true', () => {
    const fixture = setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const cards = el.querySelectorAll<HTMLButtonElement>('.zg-card');

    // Kinder = erste Card
    cards[0].click();
    fixture.detectChanges();

    expect(cards[0].getAttribute('aria-expanded')).toBe('true');
    const panel = el.querySelector('.zg-detail');
    expect(panel).not.toBeNull();
    expect(panel?.textContent).toContain('Ein Ort zum Entfalten');
    expect(panel?.textContent).toContain('In einer geborgenen Atmosphäre');

    const cta = panel!.querySelector('a.btn-primary') as HTMLAnchorElement;
    expect(cta).not.toBeNull();
    expect(cta.textContent).toContain('Kinder-Kursen');
    const href = cta.getAttribute('href') ?? '';
    expect(href).toContain('/kurse');
    expect(href).toContain('gruppe=kinder');
  });

  it('Klick auf andere Card wechselt den Inhalt des Detail-Panels', () => {
    const fixture = setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const cards = el.querySelectorAll<HTMLButtonElement>('.zg-card');

    cards[0].click(); // Kinder
    fixture.detectChanges();
    expect(el.querySelector('.zg-detail')?.textContent).toContain('Ein Ort zum Entfalten');

    cards[2].click(); // Erwachsene
    fixture.detectChanges();
    expect(el.querySelector('.zg-detail')?.textContent).toContain('Zeit für euch');
    expect(cards[0].getAttribute('aria-expanded')).toBe('false');
    expect(cards[2].getAttribute('aria-expanded')).toBe('true');
  });

  it('Erneuter Klick auf selbe Card schliesst das Panel (Toggle)', () => {
    const fixture = setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const card = el.querySelector<HTMLButtonElement>('.zg-card')!;

    card.click();
    fixture.detectChanges();
    expect(el.querySelector('.zg-detail')).not.toBeNull();

    card.click();
    fixture.detectChanges();
    expect(el.querySelector('.zg-detail')).toBeNull();
  });

  it('Close-Button im Panel schliesst das Panel', () => {
    const fixture = setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const card = el.querySelector<HTMLButtonElement>('.zg-card')!;
    card.click();
    fixture.detectChanges();

    const closeBtn = el.querySelector<HTMLButtonElement>('.zg-detail-close')!;
    expect(closeBtn).not.toBeNull();
    closeBtn.click();
    fixture.detectChanges();
    expect(el.querySelector('.zg-detail')).toBeNull();
  });

  it('Tanzstile-Section ("Was wir tanzen") wurde entfernt', () => {
    const fixture = setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.section-tanzstile')).toBeNull();
    expect(el.textContent ?? '').not.toContain('Was wir tanzen');
  });
});
