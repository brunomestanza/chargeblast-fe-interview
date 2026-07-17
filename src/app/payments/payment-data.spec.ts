import type { Payment } from './payment';
import { parsePaymentData, rebasePaymentDates } from './payment-data';

const payments: readonly Payment[] = [
  {
    id: 'pay_newest',
    customer: 'olivia.martin@example.com',
    amount: 249,
    currency: 'USD',
    status: 'succeeded',
    description: 'Subscription update',
    paymentMethod: {
      kind: 'card',
      brand: 'visa',
      lastFour: '4242',
    },
    createdAt: '2026-07-13T17:48:00.000Z',
    refundedAt: null,
    declineReason: null,
  },
  {
    id: 'pay_older',
    customer: 'liam.anderson@example.com',
    amount: 12840,
    currency: 'USD',
    status: 'refunded',
    description: 'Subscription update',
    paymentMethod: {
      kind: 'standalone',
      method: 'ach',
      lastFour: '6789',
    },
    createdAt: '2026-07-06T17:48:00.000Z',
    refundedAt: '2026-07-08T17:48:00.000Z',
    declineReason: null,
  },
];

describe('payment data', () => {
  it('parses valid payments without weakening their types', () => {
    expect(parsePaymentData(payments)).toEqual(payments);
  });

  it('rejects invalid payment values and duplicate IDs', () => {
    expect(() => parsePaymentData([{ ...payments[0], status: 'cancelled' }])).toThrow(
      'invalid payment',
    );
    expect(() => parsePaymentData([payments[0], payments[0]])).toThrow('duplicate payment IDs');
  });

  it('anchors the newest payment to the visit time and preserves date intervals', () => {
    const referenceTime = Date.parse('2030-05-20T14:30:00.000Z');
    const originalInterval = Date.parse(payments[0].createdAt) - Date.parse(payments[1].createdAt);

    const rebasedPayments = rebasePaymentDates(payments, referenceTime);

    expect(rebasedPayments[0].createdAt).toBe('2030-05-20T14:30:00.000Z');
    expect(
      Date.parse(rebasedPayments[0].createdAt) - Date.parse(rebasedPayments[1].createdAt),
    ).toBe(originalInterval);
    expect(payments[0].createdAt).toBe('2026-07-13T17:48:00.000Z');
  });
});
