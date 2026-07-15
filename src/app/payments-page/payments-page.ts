import { Component, afterNextRender, computed, signal } from '@angular/core';
import paymentData from '../../../public/data/payments.json';
import { parsePaymentData, rebasePaymentDates } from '../payments/payment-data';
import { PaymentsTable } from '../payments-table/payments-table';
import { PaymentsPageHeader } from './payments-page-header/payments-page-header';

const BASE_PAYMENTS = parsePaymentData(paymentData);

@Component({
  selector: 'app-payments-page',
  imports: [PaymentsPageHeader, PaymentsTable],
  template: `
    <app-payments-page-header />
    <app-payments-table [payments]="payments()" />
  `,
  styles: `
    :host {
      display: flex;
      flex: 1 1 auto;
      flex-direction: column;
      width: 100%;
      max-width: var(--dashboard-page-max-width, 1280px);
      min-width: 0;
      min-height: 0;
    }
  `,
})
export class PaymentsPage {
  private readonly paymentDateReference = signal<number | null>(null);

  protected readonly payments = computed(() => {
    const referenceTime = this.paymentDateReference();

    return referenceTime === null
      ? BASE_PAYMENTS
      : rebasePaymentDates(BASE_PAYMENTS, referenceTime);
  });

  constructor() {
    afterNextRender(() => this.paymentDateReference.set(Date.now()));
  }
}
