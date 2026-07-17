import { Payment } from './payment';
import {
  DEFAULT_PAYMENT_SORT,
  PAYMENT_SORT_COLUMNS,
  PaymentSortCriterion,
  cyclePaymentSort,
  parsePaymentSort,
  serializePaymentSort,
  sortPayments,
} from './payment-sort';

const basePayment: Payment = {
  id: 'pay_base',
  customer: 'customer@example.com',
  amount: 10,
  currency: 'USD',
  status: 'succeeded',
  paymentMethod: { kind: 'card', brand: 'visa', lastFour: '4242' },
  createdAt: '2026-07-13T12:00:00.000Z',
};

function payment(id: string, overrides: Partial<Payment> = {}): Payment {
  return { ...basePayment, ...overrides, id };
}

function paymentIds(
  payments: readonly Payment[],
  criteria: readonly PaymentSortCriterion[],
): readonly string[] {
  return sortPayments(payments, criteria).map(({ id }) => id);
}

describe('payment sorting', () => {
  it('replaces the implicit default, then reverses and removes the selected column', () => {
    const withAmount = cyclePaymentSort(DEFAULT_PAYMENT_SORT, 'amount');
    const amountDescending = cyclePaymentSort(withAmount, 'amount');
    const withoutAmount = cyclePaymentSort(amountDescending, 'amount');

    expect(withAmount).toEqual([{ column: 'amount', direction: 'asc' }]);
    expect(amountDescending).toEqual([{ column: 'amount', direction: 'desc' }]);
    expect(withoutAmount).toEqual([]);
    expect(withAmount).not.toBe(DEFAULT_PAYMENT_SORT);
  });

  it('replaces the implicit default for every other column and appends later columns', () => {
    for (const column of PAYMENT_SORT_COLUMNS.filter((candidate) => candidate !== 'created')) {
      expect(cyclePaymentSort(DEFAULT_PAYMENT_SORT, column)).toEqual([
        { column, direction: 'asc' },
      ]);
    }

    const withStatus = cyclePaymentSort(DEFAULT_PAYMENT_SORT, 'description');

    expect(cyclePaymentSort(withStatus, 'amount')).toEqual([
      { column: 'description', direction: 'asc' },
      { column: 'amount', direction: 'asc' },
    ]);
  });

  it('parses and serializes a shareable, canonical sort queue', () => {
    expect(parsePaymentSort(null)).toEqual(DEFAULT_PAYMENT_SORT);
    expect(parsePaymentSort('')).toEqual(DEFAULT_PAYMENT_SORT);
    expect(parsePaymentSort('none')).toEqual([]);
    expect(
      parsePaymentSort('description.asc,payment-method.desc,description.desc,unknown.asc'),
    ).toEqual([
      { column: 'description', direction: 'asc' },
      { column: 'paymentMethod', direction: 'desc' },
    ]);
    expect(parsePaymentSort('none,description.asc')).toEqual([
      { column: 'description', direction: 'asc' },
    ]);
    expect(serializePaymentSort(DEFAULT_PAYMENT_SORT)).toBeNull();
    expect(
      serializePaymentSort([
        { column: 'created', direction: 'desc' },
        { column: 'amount', direction: 'asc' },
      ]),
    ).toBe('created.desc,amount.asc');
    expect(
      serializePaymentSort([...DEFAULT_PAYMENT_SORT, { column: 'description', direction: 'asc' }]),
    ).toBe('created.desc,description.asc');
    expect(serializePaymentSort([{ column: 'description', direction: 'asc' }])).toBe(
      'description.asc',
    );
    expect(serializePaymentSort([])).toBe('none');
    expect(parsePaymentSort('none,unknown.asc')).toEqual([]);
    expect(parsePaymentSort('unknown.asc')).toEqual(DEFAULT_PAYMENT_SORT);
  });

  it('preserves explicit queue order and canonicalizes legacy empty-base URLs', () => {
    expect(parsePaymentSort('created.desc,description.asc')).toEqual([
      { column: 'created', direction: 'desc' },
      { column: 'description', direction: 'asc' },
    ]);
    expect(parsePaymentSort('description.asc,created.desc')).toEqual([
      { column: 'description', direction: 'asc' },
      { column: 'created', direction: 'desc' },
    ]);
    expect(parsePaymentSort('created.asc')).toEqual([{ column: 'created', direction: 'asc' }]);
    expect(parsePaymentSort('none,created.asc')).toEqual([{ column: 'created', direction: 'asc' }]);
    expect(serializePaymentSort(parsePaymentSort('created.desc,description.asc'))).toBe(
      'created.desc,description.asc',
    );
    expect(serializePaymentSort(parsePaymentSort('none,description.asc'))).toBe('description.asc');
    expect(
      serializePaymentSort([
        { column: 'description', direction: 'asc' },
        { column: 'created', direction: 'desc' },
      ]),
    ).toBe('description.asc,created.desc');
  });

  it('round-trips queues with and without the default sort prefix', () => {
    const queues: readonly (readonly PaymentSortCriterion[])[] = [
      DEFAULT_PAYMENT_SORT,
      [...DEFAULT_PAYMENT_SORT, { column: 'description', direction: 'asc' }],
      [],
      [{ column: 'description', direction: 'asc' }],
      [{ column: 'created', direction: 'asc' }],
      [
        { column: 'description', direction: 'asc' },
        { column: 'created', direction: 'desc' },
      ],
    ];

    for (const queue of queues) {
      expect(parsePaymentSort(serializePaymentSort(queue))).toEqual(queue);
    }
  });

  it('sorts Customer by its complete text value', () => {
    const payments = [
      payment('pay_20', { customer: 'zoe@example.com' }),
      payment('pay_3', { customer: 'Amy@example.com' }),
      payment('pay_11', { customer: 'ben@example.com' }),
    ];

    expect(paymentIds(payments, [{ column: 'customer', direction: 'asc' }])).toEqual([
      'pay_3',
      'pay_11',
      'pay_20',
    ]);
  });

  it('sorts Amount by its USD value rather than by currency and raw number', () => {
    const payments = [
      // 10.00 USD, 10.26 USD and 6.17 USD once converted at the ECB rates.
      payment('usd-10', { currency: 'USD', amount: 10 }),
      payment('eur-9', { currency: 'EUR', amount: 9 }),
      payment('jpy-1000', { currency: 'JPY', amount: 1000 }),
    ];

    expect(paymentIds(payments, [{ column: 'amount', direction: 'asc' }])).toEqual([
      'jpy-1000',
      'usd-10',
      'eur-9',
    ]);
    expect(paymentIds(payments, [{ column: 'amount', direction: 'desc' }])).toEqual([
      'eur-9',
      'usd-10',
      'jpy-1000',
    ]);
  });

  it('sorts Amounts without a USD equivalent after the converted ones', () => {
    const payments = [
      payment('unknown-1000', { currency: 'XYZ', amount: 1000 }),
      payment('usd-10', { currency: 'USD', amount: 10 }),
      payment('unknown-5', { currency: 'XYZ', amount: 5 }),
    ];

    expect(paymentIds(payments, [{ column: 'amount', direction: 'asc' }])).toEqual([
      'usd-10',
      'unknown-5',
      'unknown-1000',
    ]);
  });

  it('sorts Created by its absolute timestamp', () => {
    const payments = [
      payment('succeeded', { status: 'succeeded', createdAt: '2026-07-13T12:00:00Z' }),
      payment('failed', { status: 'failed', createdAt: '2026-07-13T10:00:00-03:00' }),
      payment('disputed', { status: 'disputed', createdAt: '2026-07-13T11:30:00Z' }),
      payment('refunded', { status: 'refunded', createdAt: '2026-07-13T09:00:00Z' }),
    ];

    expect(paymentIds(payments, [{ column: 'created', direction: 'asc' }])).toEqual([
      'refunded',
      'disputed',
      'succeeded',
      'failed',
    ]);
  });

  it('sorts Payment method by wallet or method name, then brand and last four', () => {
    const payments = [
      payment('visa', {
        paymentMethod: { kind: 'card', brand: 'visa', lastFour: '4242' },
      }),
      payment('ach', {
        paymentMethod: { kind: 'standalone', method: 'ach', lastFour: '6789' },
      }),
      payment('apple-mastercard', {
        paymentMethod: {
          kind: 'card',
          brand: 'mastercard',
          wallet: 'apple-pay',
          lastFour: '4444',
        },
      }),
      payment('apple-visa', {
        paymentMethod: {
          kind: 'card',
          brand: 'visa',
          wallet: 'apple-pay',
          lastFour: '1111',
        },
      }),
    ];

    expect(paymentIds(payments, [{ column: 'paymentMethod', direction: 'asc' }])).toEqual([
      'ach',
      'apple-mastercard',
      'apple-visa',
      'visa',
    ]);
  });

  it('uses later columns only to break ties and preserves input order after all ties', () => {
    const payments = [
      payment('first-succeeded', { status: 'succeeded', amount: 10 }),
      payment('failed', { status: 'failed', amount: 5 }),
      payment('second-succeeded', { status: 'succeeded', amount: 10 }),
      payment('largest-succeeded', { status: 'succeeded', amount: 20 }),
    ];
    const originalPayments = [...payments];

    expect(
      paymentIds(payments, [
        { column: 'description', direction: 'asc' },
        { column: 'amount', direction: 'desc' },
      ]),
    ).toEqual(['largest-succeeded', 'first-succeeded', 'second-succeeded', 'failed']);
    expect(payments).toEqual(originalPayments);
  });
});
