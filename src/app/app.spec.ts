import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the payments table in the main screen', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('main.app-shell')).toBeTruthy();
    expect(compiled.querySelector('app-payments-table')).toBeTruthy();
    expect(compiled.querySelector('h1')?.textContent).toContain('Payments');
  });

  it('should expose every available payment icon and the missing-icon fallback', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const imageSources = Array.from(
      compiled.querySelectorAll<HTMLImageElement>('.payment-icon__trigger img'),
    ).map((image) => image.getAttribute('src') ?? '');
    const expectedSources = [
      '/icons/payment-methods/card-brands/visa.webp',
      '/icons/payment-methods/card-brands/mastercard.webp',
      '/icons/payment-methods/card-brands/amex.webp',
      '/icons/payment-methods/card-brands/discover.webp',
      '/icons/payment-methods/card-brands/diners-club.webp',
      '/icons/payment-methods/card-brands/jcb.webp',
      '/icons/payment-methods/card-brands/unionpay.webp',
      '/icons/payment-methods/wallets/apple-pay.webp',
      '/icons/payment-methods/wallets/google-pay.webp',
      '/icons/payment-methods/wallets/link.webp',
      '/icons/payment-methods/methods/ach.webp',
      '/icons/payment-methods/methods/sepa.webp',
      '/icons/payment-methods/methods/ideal.webp',
      '/icons/payment-methods/methods/klarna.webp',
      '/icons/payment-methods/methods/afterpay.webp',
      '/icons/payment-methods/methods/paypal.webp',
      '/icons/payment-methods/methods/cash-app-pay.webp',
      '/icons/payment-methods/methods/pix.webp',
      '/icons/payment-methods/methods/boleto.webp',
    ];

    for (const source of expectedSources) {
      expect(imageSources.some((imageSource) => imageSource.endsWith(source))).toBe(true);
    }

    expect(compiled.querySelector('.payment-icon__trigger--fallback')?.textContent?.trim()).toBe(
      'EL',
    );
  });
});
