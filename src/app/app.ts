import { Component, signal } from '@angular/core';
import { Payment } from './payments-table/payment';
import { PaymentsTable } from './payments-table/payments-table';

@Component({
  selector: 'app-root',
  imports: [PaymentsTable],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly payments = signal<readonly Payment[]>([
    {
      id: 'pay_3RxQZ9Jx7yL2kA4fB8mD',
      customer: 'olivia.martin@example.com',
      amount: 249,
      currency: 'USD',
      status: 'succeeded',
      paymentMethod: {
        kind: 'card',
        brand: 'Visa',
        brandKey: 'visa',
        mark: 'VISA',
        lastFour: '4242',
      },
      createdAt: '2026-07-13T14:48:00-03:00',
    },
    {
      id: 'pay_3RxQVuJx7yL2kA4fN6cP',
      customer: 'ethan.williams@example.com',
      amount: 89.5,
      currency: 'EUR',
      status: 'pending',
      paymentMethod: {
        kind: 'card',
        brand: 'Mastercard',
        brandKey: 'mastercard',
        mark: 'MC',
        lastFour: '4444',
      },
      createdAt: '2026-07-13T14:42:00-03:00',
    },
    {
      id: 'pay_3RxQPnJx7yL2kA4fH2wS',
      customer: 'mia.thompson@example.co.uk',
      amount: 1240,
      currency: 'GBP',
      status: 'succeeded',
      paymentMethod: {
        kind: 'card',
        brand: 'Amex',
        brandKey: 'amex',
        mark: 'AMEX',
        lastFour: '0005',
      },
      createdAt: '2026-07-13T14:33:00-03:00',
    },
    {
      id: 'pay_3RxQJcJx7yL2kA4fC9qT',
      customer: 'noah.bennett@example.com',
      amount: 64.99,
      currency: 'USD',
      status: 'failed',
      paymentMethod: {
        kind: 'card',
        brand: 'Visa',
        brandKey: 'visa',
        mark: 'VISA',
        lastFour: '0341',
      },
      createdAt: '2026-07-13T14:20:00-03:00',
    },
    {
      id: 'pay_3RxQERJx7yL2kA4fV5dM',
      customer: 'ava.patel@example.ca',
      amount: 318.2,
      currency: 'CAD',
      status: 'refunded',
      paymentMethod: {
        kind: 'wallet',
        brand: 'Apple Pay',
        brandKey: 'apple-pay',
        mark: 'PAY',
        lastFour: '9010',
      },
      createdAt: '2026-07-13T13:38:00-03:00',
    },
    {
      id: 'pay_3RxPzKJx7yL2kA4fR7bN',
      customer: 'liam.anderson@example.com',
      amount: 12840,
      currency: 'USD',
      status: 'succeeded',
      paymentMethod: {
        kind: 'ach',
        brand: 'ACH',
        brandKey: 'ach',
        mark: 'ACH',
        lastFour: '6789',
      },
      createdAt: '2026-07-13T12:51:00-03:00',
    },
    {
      id: 'pay_3RxPkTJx7yL2kA4fY1gW',
      customer: 'sophia.costa@example.com.br',
      amount: 729.9,
      currency: 'BRL',
      status: 'pending',
      paymentMethod: {
        kind: 'card',
        brand: 'Mastercard',
        brandKey: 'mastercard',
        mark: 'MC',
        lastFour: '5454',
      },
      createdAt: '2026-07-13T11:47:00-03:00',
    },
    {
      id: 'pay_3RxPNmJx7yL2kA4fK8sH',
      customer: 'lucas.miller@example.com',
      amount: 199,
      currency: 'USD',
      status: 'succeeded',
      paymentMethod: {
        kind: 'card',
        brand: 'Visa',
        brandKey: 'visa',
        mark: 'VISA',
        lastFour: '1881',
      },
      createdAt: '2026-07-13T09:55:00-03:00',
    },
  ]);
}
