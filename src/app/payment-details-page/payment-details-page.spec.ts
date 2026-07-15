import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PAYMENT_DETAILS_DATA } from './payment-details.data';
import { PaymentDetailsPage } from './payment-details-page';

describe('PaymentDetailsPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentDetailsPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders the fixed payment data with semantic detail sections', () => {
    const fixture = TestBed.createComponent(PaymentDetailsPage);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const sectionHeadings = Array.from(element.querySelectorAll('h2')).map((heading) =>
      heading.textContent?.trim(),
    );

    expect(element.querySelector('h1')?.textContent).toContain('£34.99 GBP');
    expect(element.textContent).toContain(PAYMENT_DETAILS_DATA.paymentId);
    expect(element.textContent).toContain(PAYMENT_DETAILS_DATA.customer.email);
    expect(element.querySelectorAll('.activity-list > li')).toHaveLength(3);
    expect(sectionHeadings).toEqual([
      'Recent activity',
      'Payment breakdown',
      'Payment method',
      'Details',
      'Customer',
    ]);
    expect(element.querySelector('nav[aria-label="Breadcrumb"] a')?.getAttribute('href')).toBe('/');
    expect(element.querySelectorAll('dl')).toHaveLength(4);
  });
});
