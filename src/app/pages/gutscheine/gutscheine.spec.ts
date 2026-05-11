import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';

import { Gutscheine } from './gutscheine';
import { CotasApiService } from '../../core/services/cotas-api.service';
import { CotasVoucher } from '../../core/models/cotas.models';

const mockVouchers: CotasVoucher[] = [
  { id: '1', path: 'a.jpg', thumbnailUrl: 'http://x/small_a.jpg', imageUrl: 'http://x/a.jpg' },
  { id: '2', path: 'b.jpg', thumbnailUrl: 'http://x/small_b.jpg', imageUrl: 'http://x/b.jpg' },
];

describe('Gutscheine (Liste)', () => {
  function setup(opts: { vouchers?: readonly CotasVoucher[] | null } = {}) {
    const apiMock = {
      listVouchers: () =>
        of(opts.vouchers === undefined ? mockVouchers : opts.vouchers ?? []),
    };
    TestBed.configureTestingModule({
      imports: [Gutscheine],
      providers: [provideRouter([]), { provide: CotasApiService, useValue: apiMock }],
    });
    return TestBed.createComponent(Gutscheine);
  }

  it('rendert Loading-State waehrend vouchers noch nicht da sind', () => {
    // Wenn der Observable nie emittiert, bleibt vouchers() null.
    const apiMock = { listVouchers: () => new Subject().asObservable() };
    TestBed.configureTestingModule({
      imports: [Gutscheine],
      providers: [provideRouter([]), { provide: CotasApiService, useValue: apiMock }],
    });
    const fixture = TestBed.createComponent(Gutscheine);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Gutscheine werden geladen',
    );
  });

  it('rendert Empty-State wenn keine Vorlagen vorhanden sind', () => {
    const fixture = setup({ vouchers: [] });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Aktuell keine Vorlagen');
  });

  it('rendert ein Card pro Voucher mit Thumbnail-URL', () => {
    const fixture = setup();
    fixture.detectChanges();
    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('.voucher-card');
    expect(cards.length).toBe(2);
    const firstImg = cards[0].querySelector('img');
    expect(firstImg?.getAttribute('src')).toBe('http://x/small_a.jpg');
  });
});
