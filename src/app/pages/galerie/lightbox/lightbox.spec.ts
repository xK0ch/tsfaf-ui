import { TestBed } from '@angular/core/testing';

import { Lightbox } from './lightbox';
import type { Photo } from '../galerie-data';

function mkPhoto(over: Partial<Photo> = {}): Photo {
  return {
    id: 1,
    alias: 'p-1',
    caption: 'Bild 1',
    thumb: 'https://example.com/thumb1.jpg',
    detail: 'https://example.com/det1.jpg',
    original: 'https://example.com/orig1.jpg',
    ...over,
  };
}

interface LightboxCmp {
  idx: { (): number };
  current: { (): Photo | undefined };
  total: { (): number };
  canPrev: { (): boolean };
  canNext: { (): boolean };
  prev(): void;
  next(): void;
  close(): void;
  onKeyDown(e: KeyboardEvent): void;
  onBackdropClick(e: MouseEvent): void;
  onTouchStart(e: TouchEvent): void;
  onTouchEnd(e: TouchEvent): void;
}

describe('Lightbox', () => {
  function setup(photos: readonly Photo[], startIdx = 0) {
    TestBed.configureTestingModule({ imports: [Lightbox] });
    const fixture = TestBed.createComponent(Lightbox);
    fixture.componentRef.setInput('photos', photos);
    fixture.componentRef.setInput('startIdx', startIdx);
    fixture.detectChanges();
    return fixture;
  }

  // ─── Rendering ──────────────────────────────────────────────────

  it('rendert das aktuelle Foto als <img> mit Original-URL + Caption', () => {
    const fixture = setup([
      mkPhoto({ id: 1, caption: 'Erstes', original: 'https://x/o1.jpg' }),
    ]);
    const el = fixture.nativeElement as HTMLElement;
    const img = el.querySelector('img.lightbox-img') as HTMLImageElement | null;
    expect(img).not.toBeNull();
    expect(img!.src).toBe('https://x/o1.jpg');
    expect(img!.alt).toBe('Erstes');
    expect(el.querySelector('.lightbox-caption')?.textContent).toContain('Erstes');
  });

  it('Counter zeigt aktuelle Position / Gesamt', () => {
    const fixture = setup([mkPhoto({ id: 1 }), mkPhoto({ id: 2 }), mkPhoto({ id: 3 })], 1);
    const counter = (fixture.nativeElement as HTMLElement).querySelector(
      '.lightbox-counter',
    )?.textContent ?? '';
    expect(counter.replace(/\s/g, '')).toContain('2/3');
  });

  // ─── startIdx-Sync ──────────────────────────────────────────────

  it('idx wird mit startIdx initialisiert', () => {
    const fixture = setup([mkPhoto({ id: 1 }), mkPhoto({ id: 2 })], 1);
    const cmp = fixture.componentInstance as unknown as LightboxCmp;
    expect(cmp.idx()).toBe(1);
  });

  it('startIdx-Aenderung setzt idx neu (effect)', () => {
    const fixture = setup([mkPhoto({ id: 1 }), mkPhoto({ id: 2 }), mkPhoto({ id: 3 })], 0);
    const cmp = fixture.componentInstance as unknown as LightboxCmp;
    expect(cmp.idx()).toBe(0);
    fixture.componentRef.setInput('startIdx', 2);
    fixture.detectChanges();
    expect(cmp.idx()).toBe(2);
  });

  // ─── prev / next ────────────────────────────────────────────────

  it('prev/next inkrementieren bzw. dekrementieren idx', () => {
    const fixture = setup([mkPhoto({ id: 1 }), mkPhoto({ id: 2 }), mkPhoto({ id: 3 })]);
    const cmp = fixture.componentInstance as unknown as LightboxCmp;
    cmp.next();
    expect(cmp.idx()).toBe(1);
    cmp.next();
    expect(cmp.idx()).toBe(2);
    cmp.prev();
    expect(cmp.idx()).toBe(1);
  });

  it('canPrev / canNext respektieren die Grenzen', () => {
    const fixture = setup([mkPhoto({ id: 1 }), mkPhoto({ id: 2 })]);
    const cmp = fixture.componentInstance as unknown as LightboxCmp;
    expect(cmp.canPrev()).toBe(false);
    expect(cmp.canNext()).toBe(true);
    cmp.next();
    expect(cmp.canPrev()).toBe(true);
    expect(cmp.canNext()).toBe(false);
  });

  it('next/prev am Ende/Anfang sind No-Ops', () => {
    const fixture = setup([mkPhoto({ id: 1 })]);
    const cmp = fixture.componentInstance as unknown as LightboxCmp;
    cmp.prev();
    cmp.next();
    expect(cmp.idx()).toBe(0);
  });

  // ─── Tastatur-Navigation ───────────────────────────────────────

  it('Escape feuert closed-Output', () => {
    const fixture = setup([mkPhoto({ id: 1 })]);
    let closedFired = 0;
    fixture.componentRef.instance.closed.subscribe(() => closedFired++);
    const cmp = fixture.componentInstance as unknown as LightboxCmp;
    const ev = new KeyboardEvent('keydown', { key: 'Escape' });
    cmp.onKeyDown(ev);
    expect(closedFired).toBe(1);
  });

  it('ArrowLeft / ArrowRight navigieren', () => {
    const fixture = setup([mkPhoto({ id: 1 }), mkPhoto({ id: 2 }), mkPhoto({ id: 3 })], 1);
    const cmp = fixture.componentInstance as unknown as LightboxCmp;
    cmp.onKeyDown(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(cmp.idx()).toBe(0);
    cmp.onKeyDown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(cmp.idx()).toBe(1);
  });

  it('Andere Tasten machen nichts', () => {
    const fixture = setup([mkPhoto({ id: 1 }), mkPhoto({ id: 2 })]);
    const cmp = fixture.componentInstance as unknown as LightboxCmp;
    cmp.onKeyDown(new KeyboardEvent('keydown', { key: 'a' }));
    expect(cmp.idx()).toBe(0);
  });

  // ─── Backdrop-Click ────────────────────────────────────────────

  it('Klick auf Backdrop (target===currentTarget) feuert closed', () => {
    const fixture = setup([mkPhoto({ id: 1 })]);
    let closedFired = 0;
    fixture.componentRef.instance.closed.subscribe(() => closedFired++);
    const cmp = fixture.componentInstance as unknown as LightboxCmp;
    const backdrop = (fixture.nativeElement as HTMLElement).querySelector(
      '.lightbox-backdrop',
    ) as HTMLElement;
    cmp.onBackdropClick({ target: backdrop, currentTarget: backdrop } as unknown as MouseEvent);
    expect(closedFired).toBe(1);
  });

  it('Klick auf inneres Element feuert NICHT closed', () => {
    const fixture = setup([mkPhoto({ id: 1 })]);
    let closedFired = 0;
    fixture.componentRef.instance.closed.subscribe(() => closedFired++);
    const cmp = fixture.componentInstance as unknown as LightboxCmp;
    const backdrop = (fixture.nativeElement as HTMLElement).querySelector(
      '.lightbox-backdrop',
    ) as HTMLElement;
    const inner = (fixture.nativeElement as HTMLElement).querySelector(
      '.lightbox-img',
    ) as HTMLElement;
    cmp.onBackdropClick({ target: inner, currentTarget: backdrop } as unknown as MouseEvent);
    expect(closedFired).toBe(0);
  });

  // ─── Touch-Swipe ───────────────────────────────────────────────

  it('Swipe nach rechts (positives dx) navigiert zurueck', () => {
    const fixture = setup([mkPhoto({ id: 1 }), mkPhoto({ id: 2 })], 1);
    const cmp = fixture.componentInstance as unknown as LightboxCmp;
    cmp.onTouchStart({ touches: [{ clientX: 0 }] } as unknown as TouchEvent);
    cmp.onTouchEnd({ changedTouches: [{ clientX: 100 }] } as unknown as TouchEvent);
    expect(cmp.idx()).toBe(0);
  });

  it('Swipe nach links (negatives dx) navigiert vorwaerts', () => {
    const fixture = setup([mkPhoto({ id: 1 }), mkPhoto({ id: 2 })]);
    const cmp = fixture.componentInstance as unknown as LightboxCmp;
    cmp.onTouchStart({ touches: [{ clientX: 100 }] } as unknown as TouchEvent);
    cmp.onTouchEnd({ changedTouches: [{ clientX: 0 }] } as unknown as TouchEvent);
    expect(cmp.idx()).toBe(1);
  });

  it('Kleiner Swipe (< 50px) wird ignoriert', () => {
    const fixture = setup([mkPhoto({ id: 1 }), mkPhoto({ id: 2 })]);
    const cmp = fixture.componentInstance as unknown as LightboxCmp;
    cmp.onTouchStart({ touches: [{ clientX: 0 }] } as unknown as TouchEvent);
    cmp.onTouchEnd({ changedTouches: [{ clientX: 30 }] } as unknown as TouchEvent);
    expect(cmp.idx()).toBe(0);
  });

  // ─── body.overflow Side-Effect ─────────────────────────────────

  it('setzt body.style.overflow auf hidden waehrend Lightbox offen', () => {
    document.body.style.overflow = '';
    const fixture = setup([mkPhoto({ id: 1 })]);
    expect(document.body.style.overflow).toBe('hidden');
    fixture.destroy();
    // ngOnDestroy stellt vorherigen Wert (leerer String) wieder her
    expect(document.body.style.overflow).toBe('');
  });
});
