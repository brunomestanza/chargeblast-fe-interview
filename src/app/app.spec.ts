import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { PAGE_SIZE_STORAGE_KEY } from './payments-table/payment-table-preferences.adapter';

describe('App', () => {
  beforeEach(async () => {
    window.localStorage.removeItem(PAGE_SIZE_STORAGE_KEY);
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  afterEach(() => {
    window.localStorage.removeItem(PAGE_SIZE_STORAGE_KEY);
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the payments table in the main screen', async () => {
    const beforeRender = Date.now();
    const fixture = await createApp('/');

    const compiled = fixture.nativeElement as HTMLElement;
    const newestPaymentTime = Date.parse(compiled.querySelector('time')?.dateTime ?? '');

    expect(compiled.querySelector('main.dashboard-shell__content')).toBeTruthy();
    expect(compiled.querySelector('app-sidebar')).toBeTruthy();
    expect(compiled.querySelector('app-top-navigation')).toBeTruthy();
    expect(compiled.querySelector('app-payments-table')).toBeTruthy();
    expect(compiled.querySelector('h1')?.textContent).toContain('Payments');
    expect(newestPaymentTime).toBeGreaterThanOrEqual(beforeRender);
    expect(newestPaymentTime).toBeLessThanOrEqual(Date.now());
  });

  it('should open fixed payment details from a table row and preserve the table view', async () => {
    const fixture = await createApp('/?view=compact');
    const compiled = fixture.nativeElement as HTMLElement;
    const router = TestBed.inject(Router);
    const firstRow = compiled.querySelector<HTMLTableRowElement>('tbody tr[appPaymentRow]')!;
    const paymentLink = firstRow.querySelector<HTMLAnchorElement>('.payment-id-link')!;
    const selectedPaymentId = paymentLink.getAttribute('title')!;

    firstRow.querySelector<HTMLButtonElement>('.copy-action')?.click();
    await Promise.resolve();

    expect(router.url).toBe('/?view=compact');
    expect(paymentLink.getAttribute('href')).toBe(`/payments/${selectedPaymentId}`);

    firstRow.querySelector<HTMLElement>('.customer')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const detailsPage = compiled.querySelector<HTMLElement>('app-payment-details-page')!;
    const initialDetails = detailsPage.textContent?.replace(/\s+/g, ' ').trim();
    const activeSidebarLink = compiled.querySelector<HTMLAnchorElement>(
      '.sidebar__link[aria-current="page"]',
    );
    const backLink = Array.from(detailsPage.querySelectorAll<HTMLAnchorElement>('a')).find(
      (link) => link.textContent?.trim() === 'Payments',
    );

    expect(router.url).toBe(`/payments/${selectedPaymentId}?view=compact`);
    expect(detailsPage.querySelector('h1')?.textContent).toContain('£34.99');
    expect(detailsPage.textContent).toContain('Recent activity');
    expect(activeSidebarLink?.textContent?.trim()).toBe('Payments');
    expect(backLink?.getAttribute('href')).toBe('/?view=compact');
    expect(document.activeElement).toBe(compiled.querySelector('#main-content'));
    expect(document.title).toBe('Payment details | Chargeblast');

    await router.navigateByUrl('/payments/a-different-payment?view=compact');
    await fixture.whenStable();
    fixture.detectChanges();

    const nextDetails = compiled
      .querySelector<HTMLElement>('app-payment-details-page')
      ?.textContent?.replace(/\s+/g, ' ')
      .trim();

    expect(nextDetails).toBe(initialDetails);

    backLink?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toBe('/?view=compact');
    expect(compiled.querySelector('app-payments-table')).toBeTruthy();

    const returnedPaymentLink = compiled.querySelector<HTMLAnchorElement>('.payment-id-link')!;
    const returnedPaymentId = returnedPaymentLink.getAttribute('title')!;
    returnedPaymentLink.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toBe(`/payments/${returnedPaymentId}?view=compact`);
    expect(compiled.querySelector('app-payment-details-page')).toBeTruthy();
  });

  it('should expose every available payment icon and the missing-icon fallback', async () => {
    const fixture = await createApp('/');

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

  it('should restore the stored page size when the user opens the page', async () => {
    window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, '50');

    const fixture = await createApp('/');

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector<HTMLSelectElement>('#payments-page-size')?.value).toBe('50');
    expect(compiled.querySelectorAll('tbody tr')).toHaveLength(50);
  });

  it('should render only the requested primary sections and mark the active route', async () => {
    const fixture = await createApp('/customers');
    const compiled = fixture.nativeElement as HTMLElement;
    const links = Array.from(
      compiled.querySelectorAll<HTMLAnchorElement>('.sidebar__navigation a'),
    );

    expect(links.map((link) => link.textContent?.trim())).toEqual([
      'Payments',
      'Customers',
      'Balances',
      'Product Catalog',
    ]);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/',
      '/customers',
      '/balances',
      '/product-catalog',
    ]);
    expect(links.filter((link) => link.getAttribute('aria-current') === 'page')).toHaveLength(1);
    expect(
      links.find((link) => link.getAttribute('aria-current') === 'page')?.textContent?.trim(),
    ).toBe('Customers');
  });

  it('should keep Payments active when the table view is represented in the URL', async () => {
    const fixture = await createApp('/?view=compact');
    const activeLink = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      '.sidebar__link[aria-current="page"]',
    );

    expect(activeLink?.textContent?.trim()).toBe('Payments');
  });

  it('should open the complete settings page from the top navigation gear', async () => {
    const fixture = await createApp('/');
    const compiled = fixture.nativeElement as HTMLElement;
    const settingsLink = compiled.querySelector<HTMLAnchorElement>(
      'app-top-navigation a[aria-label="Settings"]',
    );

    settingsLink?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(compiled.querySelector('app-sidebar')).toBeTruthy();
    expect(compiled.querySelector('app-top-navigation')).toBeTruthy();
    expect(compiled.querySelector('app-settings-page h1')?.textContent?.trim()).toBe('Settings');
    expect(settingsLink?.getAttribute('href')).toBe('/settings');
    expect(settingsLink?.getAttribute('aria-current')).toBe('page');
    expect(document.activeElement).toBe(compiled.querySelector('#main-content'));
    expect(compiled.querySelectorAll('.settings-item')).toHaveLength(20);
    expect(
      Array.from(compiled.querySelectorAll<HTMLAnchorElement>('.settings-item')).every(
        (link) => link.getAttribute('href') === '/mock',
      ),
    ).toBe(true);
  });

  it.each(['/customers', '/balances', '/product-catalog', '/mock'])(
    'should keep the sidebar and render the mock screen at %s',
    async (url) => {
      const fixture = await createApp(url);
      const compiled = fixture.nativeElement as HTMLElement;

      expect(compiled.querySelector('app-sidebar')).toBeTruthy();
      expect(compiled.querySelector('h1')?.textContent?.trim()).toBe(
        'This screen is a mock in this implementation.',
      );
      expect(
        compiled.querySelector<HTMLAnchorElement>('.mock-page__back')?.getAttribute('href'),
      ).toBe('/');
    },
  );

  it('should always return from the mock screen to the home route', async () => {
    const fixture = await createApp('/balances');
    const router = TestBed.inject(Router);
    const element = fixture.nativeElement as HTMLElement;
    const backLink = element.querySelector<HTMLAnchorElement>('.mock-page__back');

    backLink?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toBe('/');
    expect(element.querySelector('app-payments-table')).toBeTruthy();
  });
});

async function createApp(url: string) {
  const fixture = TestBed.createComponent(App);
  fixture.detectChanges();
  await TestBed.inject(Router).navigateByUrl(url);
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}
