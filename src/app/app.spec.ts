import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { PAGE_SIZE_STORAGE_KEY } from './payments-table/payment-table-preferences.adapter';

describe('App', () => {
  beforeEach(async () => {
    window.localStorage.removeItem(PAGE_SIZE_STORAGE_KEY);
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes, withComponentInputBinding())],
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
    expect(compiled.querySelector('h1')?.textContent).toContain('Transactions');
    expect(newestPaymentTime).toBeGreaterThanOrEqual(beforeRender);
    expect(newestPaymentTime).toBeLessThanOrEqual(Date.now());
  });

  it('should open the selected payment details from a table row and preserve the table view', async () => {
    const fixture = await createApp('/?view=compact');
    const compiled = fixture.nativeElement as HTMLElement;
    const router = TestBed.inject(Router);
    const firstRow = compiled.querySelector<HTMLTableRowElement>('tbody tr[appPaymentRow]')!;
    const selectedRowAmount = firstRow.querySelector('.amount-value')?.textContent?.trim() ?? '';

    expect(router.url).toBe('/?view=compact');
    expect(selectedRowAmount).toBeTruthy();

    firstRow.querySelector<HTMLElement>('.customer')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const selectedPaymentId = decodeURIComponent(
      router.url.match(/\/payments\/([^?]+)/)?.[1] ?? '',
    );
    expect(selectedPaymentId).toBeTruthy();

    const detailsPage = compiled.querySelector<HTMLElement>('app-payment-details-page')!;
    const initialDetails = detailsPage.textContent?.replace(/\s+/g, ' ').trim();
    const activeSidebarLink = compiled.querySelector<HTMLAnchorElement>(
      '.sidebar__link[aria-current="page"]',
    );
    const backLink = Array.from(detailsPage.querySelectorAll<HTMLAnchorElement>('a')).find(
      (link) => link.textContent?.trim() === 'Transactions',
    );

    expect(router.url).toBe(`/payments/${selectedPaymentId}?view=compact`);
    expect(detailsPage.querySelector('h1')?.textContent).toContain(selectedRowAmount);
    expect(detailsPage.textContent).toContain('Recent activity');
    expect(activeSidebarLink?.textContent?.trim()).toBe('Transactions');
    expect(backLink?.getAttribute('href')).toBe('/?view=compact');
    expect(document.activeElement).toBe(compiled.querySelector('#main-content'));
    expect(document.title).toBe('Payment details | Chargeblast');

    await router.navigateByUrl('/payments/pay_3RxPkTJx7yL2kA4fY1gW?view=compact');
    await fixture.whenStable();
    fixture.detectChanges();

    const nextDetailsPage = compiled.querySelector<HTMLElement>('app-payment-details-page');
    const nextDetails = nextDetailsPage?.textContent?.replace(/\s+/g, ' ').trim();

    expect(nextDetails).not.toBe(initialDetails);
    expect(nextDetailsPage?.querySelector('h1')?.textContent).toContain('BRL');

    backLink?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toBe('/?view=compact');
    expect(compiled.querySelector('app-payments-table')).toBeTruthy();

    const returnedRow = compiled.querySelector<HTMLTableRowElement>('tbody tr[appPaymentRow]')!;
    returnedRow.querySelector<HTMLElement>('.customer')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toContain('/payments/');
    expect(router.url).toContain('view=compact');
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

  it('should render the reference navigation groups in order and mark the active route', async () => {
    const fixture = await createApp('/customers');
    const compiled = fixture.nativeElement as HTMLElement;
    const groups = Array.from(compiled.querySelectorAll<HTMLElement>('.sidebar__navigation'));
    const labelsOf = (group: HTMLElement) =>
      Array.from(group.querySelectorAll<HTMLAnchorElement>('a')).map((link) =>
        link.textContent?.trim(),
      );

    expect(
      groups.map((group) => group.querySelector('.sidebar__section-heading')?.textContent?.trim()),
    ).toEqual([undefined, 'Shortcuts', 'Products', undefined]);
    expect(labelsOf(groups[0])).toEqual([
      'Home',
      'Balances',
      'Transactions',
      'Customers',
      'Product catalog',
    ]);
    expect(labelsOf(groups[1])).toEqual(['Payments analytics', 'Reports', 'Sigma', 'Radar']);
    expect(labelsOf(groups[2])).toEqual(['Connect', 'Payments', 'Billing', 'Reporting', 'More']);
    expect(labelsOf(groups[3])).toEqual(['Developers']);

    expect(
      Array.from(groups[0].querySelectorAll<HTMLAnchorElement>('a')).map((link) =>
        link.getAttribute('href'),
      ),
    ).toEqual(['/home', '/balances', '/', '/customers', '/product-catalog']);

    const active = compiled.querySelectorAll<HTMLAnchorElement>(
      '.sidebar__link[aria-current="page"]',
    );
    expect(active).toHaveLength(1);
    expect(active[0].textContent?.trim()).toBe('Customers');
  });

  it('should keep Transactions active when the table view is represented in the URL', async () => {
    const fixture = await createApp('/?view=compact');
    const activeLink = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      '.sidebar__link[aria-current="page"]',
    );

    expect(activeLink?.textContent?.trim()).toBe('Transactions');
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
