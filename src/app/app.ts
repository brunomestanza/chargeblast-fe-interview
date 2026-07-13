import { Component, afterNextRender, computed, signal } from '@angular/core';
import paymentFixture from '../../public/data/payments.json';
import { parsePaymentFixture, rebasePaymentDates } from './payments-table/payment-mock';
import { PaymentsTable } from './payments-table/payments-table';

const BASE_PAYMENTS = parsePaymentFixture(paymentFixture);

@Component({
  selector: 'app-root',
  imports: [PaymentsTable],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
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
