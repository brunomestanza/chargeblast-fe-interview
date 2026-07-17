import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PaymentDetailsPage } from './payment-details-page';

const SELECTED_PAYMENT_ID = 'pay_3RxPkTJx7yL2kA4fY1gW';

describe('PaymentDetailsPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentDetailsPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders details derived from the selected payment with semantic sections', () => {
    const fixture = TestBed.createComponent(PaymentDetailsPage);
    fixture.componentRef.setInput('paymentId', SELECTED_PAYMENT_ID);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const sectionHeadings = Array.from(element.querySelectorAll('h2')).map((heading) =>
      heading.textContent?.trim(),
    );

    const title = element.querySelector('h1')?.textContent ?? '';
    expect(title).toContain('BRL');
    expect(title).toContain('729.90');
    expect(element.querySelector('.status-badge')?.textContent?.trim()).toContain('Uncaptured');
    expect(element.querySelector('.status-badge')?.className).toContain('status-badge--uncaptured');
    expect(element.textContent).toContain(SELECTED_PAYMENT_ID);
    expect(element.textContent).toContain('sophia.costa@example.com.br');
    expect(element.querySelectorAll('.activity-list > li').length).toBeGreaterThan(0);
    expect(sectionHeadings).toEqual([
      'Recent activity',
      'Checkout summary',
      'Payment breakdown',
      'Payment method',
      'Allowed payment methods',
      'Tax calculation',
      'Risk analysis',
      'Related payments',
      'Related objects',
      'Receipt history',
      'Events',
      'Logs',
      'Details',
      'Customer',
      'Metadata',
    ]);
    expect(element.querySelector('nav[aria-label="Breadcrumb"] a')?.getAttribute('href')).toBe('/');
    expect(element.querySelectorAll('dl')).toHaveLength(4);
  });
});
