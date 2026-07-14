import { Component, afterNextRender, computed, signal } from '@angular/core';
import paymentFixture from '../../../public/data/payments.json';
import { parsePaymentFixture, rebasePaymentDates } from '../payments-table/payment-mock';
import { PaymentsTable } from '../payments-table/payments-table';

const BASE_PAYMENTS = parsePaymentFixture(paymentFixture);

@Component({
  selector: 'app-payments-page',
  imports: [PaymentsTable],
  template: `<app-payments-table [payments]="payments()" />`,
  styles: `
    :host {
      display: block;
      width: 100%;
      max-width: 1180px;
      min-width: 0;
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
