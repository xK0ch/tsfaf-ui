import { TestBed } from '@angular/core/testing';

import { AlbumCover } from './album-cover';

describe('AlbumCover', () => {
  function setup(opts: {
    imageUrl?: string | null;
    imageAlt?: string;
    eager?: boolean;
  } = {}) {
    TestBed.configureTestingModule({ imports: [AlbumCover] });
    const fixture = TestBed.createComponent(AlbumCover);
    if (opts.imageUrl !== undefined) {
      fixture.componentRef.setInput('imageUrl', opts.imageUrl);
    }
    if (opts.imageAlt !== undefined) {
      fixture.componentRef.setInput('imageAlt', opts.imageAlt);
    }
    if (opts.eager !== undefined) {
      fixture.componentRef.setInput('eager', opts.eager);
    }
    fixture.detectChanges();
    return fixture;
  }

  // ─── Rendering: Bild vs. Platzhalter ───────────────────────────

  it('rendert <img> wenn imageUrl gesetzt ist', () => {
    const fixture = setup({
      imageUrl: 'https://example.com/foto.jpg',
      imageAlt: 'Cover-Foto',
    });
    const el = fixture.nativeElement as HTMLElement;
    const img = el.querySelector('img.album-cover-img') as HTMLImageElement | null;
    expect(img).not.toBeNull();
    expect(img!.src).toBe('https://example.com/foto.jpg');
    expect(img!.alt).toBe('Cover-Foto');
    expect(el.querySelector('.album-cover-placeholder')).toBeNull();
  });

  it('rendert Platzhalter wenn imageUrl null ist', () => {
    const fixture = setup({ imageUrl: null });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('img.album-cover-img')).toBeNull();
    const ph = el.querySelector('.album-cover-placeholder');
    expect(ph).not.toBeNull();
    expect(ph!.getAttribute('aria-hidden')).toBe('true');
  });

  it('rendert Platzhalter auch ohne expliziten Input (Default null)', () => {
    const fixture = setup();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.album-cover-placeholder')).not.toBeNull();
  });

  // ─── loading-Attribut: eager vs. lazy ──────────────────────────

  it('img hat loading="lazy" per Default', () => {
    const fixture = setup({ imageUrl: 'https://example.com/x.jpg' });
    const img = (fixture.nativeElement as HTMLElement).querySelector(
      'img.album-cover-img',
    ) as HTMLImageElement;
    expect(img.getAttribute('loading')).toBe('lazy');
  });

  it('img hat loading="eager" wenn eager=true', () => {
    const fixture = setup({
      imageUrl: 'https://example.com/x.jpg',
      eager: true,
    });
    const img = (fixture.nativeElement as HTMLElement).querySelector(
      'img.album-cover-img',
    ) as HTMLImageElement;
    expect(img.getAttribute('loading')).toBe('eager');
  });

  it('img hat decoding="async" (kein Render-Block)', () => {
    const fixture = setup({ imageUrl: 'https://example.com/x.jpg' });
    const img = (fixture.nativeElement as HTMLElement).querySelector(
      'img.album-cover-img',
    ) as HTMLImageElement;
    expect(img.getAttribute('decoding')).toBe('async');
  });

  // ─── Input-Reaktivitaet ────────────────────────────────────────

  it('wechselt von Platzhalter zu Bild wenn imageUrl gesetzt wird', () => {
    const fixture = setup({ imageUrl: null });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.album-cover-placeholder')).not.toBeNull();
    fixture.componentRef.setInput('imageUrl', 'https://example.com/spaet.jpg');
    fixture.detectChanges();
    expect(el.querySelector('img.album-cover-img')).not.toBeNull();
    expect(el.querySelector('.album-cover-placeholder')).toBeNull();
  });

  it('wechselt von Bild zu Platzhalter wenn imageUrl auf null gesetzt wird', () => {
    const fixture = setup({ imageUrl: 'https://example.com/foto.jpg' });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('img.album-cover-img')).not.toBeNull();
    fixture.componentRef.setInput('imageUrl', null);
    fixture.detectChanges();
    expect(el.querySelector('img.album-cover-img')).toBeNull();
    expect(el.querySelector('.album-cover-placeholder')).not.toBeNull();
  });

  // ─── Edge-Cases ────────────────────────────────────────────────

  it('akzeptiert leeren imageAlt (Default leerer String)', () => {
    const fixture = setup({ imageUrl: 'https://example.com/x.jpg' });
    const img = (fixture.nativeElement as HTMLElement).querySelector(
      'img.album-cover-img',
    ) as HTMLImageElement;
    expect(img.alt).toBe('');
  });
});
