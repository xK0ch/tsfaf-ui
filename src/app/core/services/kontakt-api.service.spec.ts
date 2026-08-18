import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import {
  KontaktApiService,
  type KontaktFormPayload,
  type KontaktResult,
} from './kontakt-api.service';
import { environment } from '../../../environments/environment';

function mkPayload(over: Partial<KontaktFormPayload> = {}): KontaktFormPayload {
  return {
    name: 'Max Mustermann',
    email: 'max@example.com',
    phone: '',
    subject: 'sonstiges',
    message: 'Hallo.',
    datenschutz: true,
    honeypot: '',
    ...over,
  };
}

describe('KontaktApiService', () => {
  let service: KontaktApiService;
  let http: HttpTestingController;
  const BASE = environment.kontaktApiBase;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), KontaktApiService],
    });
    service = TestBed.inject(KontaktApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('send: POST mit JSON-Body + X-Kontakt-Token Header', () => {
    let result: KontaktResult | undefined;
    service.send(mkPayload({ name: 'Anna', email: 'anna@example.com' }))
      .subscribe(r => (result = r));

    const req = http.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    if (environment.kontaktToken) {
      expect(req.request.headers.get('X-Kontakt-Token')).toBe(environment.kontaktToken);
    }
    expect(req.request.body).toMatchObject({
      name: 'Anna',
      email: 'anna@example.com',
      datenschutz: true,
    });
    req.flush({ status: 'sent' });

    expect(result).toEqual({ kind: 'sent' });
  });

  it('send: 422 -> validation-Result mit field', () => {
    let result: KontaktResult | undefined;
    service.send(mkPayload()).subscribe(r => (result = r));

    http.expectOne(BASE).flush(
      { error: 'validation', field: 'email' },
      { status: 422, statusText: 'Unprocessable Entity' },
    );

    expect(result).toEqual({ kind: 'validation', field: 'email' });
  });

  it('send: 422 ohne field -> validation-Result ohne field', () => {
    let result: KontaktResult | undefined;
    service.send(mkPayload()).subscribe(r => (result = r));

    http.expectOne(BASE).flush(
      { error: 'too_long' },
      { status: 422, statusText: 'Unprocessable Entity' },
    );

    expect(result).toEqual({ kind: 'validation', field: undefined });
  });

  it('send: 401 -> network-Result', () => {
    let result: KontaktResult | undefined;
    service.send(mkPayload()).subscribe(r => (result = r));

    http.expectOne(BASE).flush(
      { error: 'unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(result).toEqual({ kind: 'network' });
  });

  it('send: 500 -> network-Result', () => {
    let result: KontaktResult | undefined;
    service.send(mkPayload()).subscribe(r => (result = r));

    http.expectOne(BASE).flush(
      { error: 'send_failed' },
      { status: 500, statusText: 'Internal Server Error' },
    );

    expect(result).toEqual({ kind: 'network' });
  });

  it('send: complete Network-Fehler (status 0) -> network-Result', () => {
    let result: KontaktResult | undefined;
    service.send(mkPayload()).subscribe(r => (result = r));

    http.expectOne(BASE).error(new ProgressEvent('error'));

    expect(result).toEqual({ kind: 'network' });
  });
});
