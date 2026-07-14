import type { Payment } from './payment';
import { createPaymentTextSearch, matchesPaymentTextSearch } from './payment-text-search';

const cardPayment: Payment = {
  id: 'pay_3RxQZ9Jx7yL2kA4fB8mD',
  customer: 'olivia.martin@example.com',
  amount: 249,
  currency: 'USD',
  status: 'succeeded',
  paymentMethod: {
    kind: 'card',
    brand: 'visa',
    lastFour: '4242',
  },
  createdAt: '2026-07-13T14:48:00-03:00',
};

describe('payment text search', () => {
  it('matches payment ID prefixes case-insensitively when the search starts with pay', () => {
    const search = createPaymentTextSearch('PAY_3RXQZ');

    expect(matchesPaymentTextSearch(cardPayment, search)).toBe(true);
    expect(
      matchesPaymentTextSearch(
        {
          ...cardPayment,
          id: 'pay_other',
          customer: 'pay_3rxqz@example.com',
        },
        search,
      ),
    ).toBe(false);
  });

  it('does not match an ID when the non-pay search occurs after its prefix', () => {
    expect(matchesPaymentTextSearch(cardPayment, createPaymentTextSearch('3RxQZ'))).toBe(false);
  });

  it('matches email prefixes case-insensitively, but not substrings', () => {
    expect(matchesPaymentTextSearch(cardPayment, createPaymentTextSearch('OLIVIA.MARTIN'))).toBe(
      true,
    );
    expect(matchesPaymentTextSearch(cardPayment, createPaymentTextSearch('martin'))).toBe(false);
  });

  it('routes pay-prefixed searches exclusively to payment IDs', () => {
    const emailTrap: Payment = {
      ...cardPayment,
      id: 'pay_unrelated',
      customer: 'payments@example.com',
    };

    expect(matchesPaymentTextSearch(emailTrap, createPaymentTextSearch('PAYMENTS@EXAMPLE'))).toBe(
      false,
    );
  });

  it('matches numeric searches against exact card last-four values only', () => {
    const search = createPaymentTextSearch(' 4242 ');
    const numericEmailTrap: Payment = {
      ...cardPayment,
      id: 'pay_numeric_email',
      customer: '4242@example.com',
      paymentMethod: { kind: 'card', brand: 'mastercard', lastFour: '9999' },
    };
    const standaloneLastFour: Payment = {
      ...cardPayment,
      id: 'pay_standalone',
      paymentMethod: { kind: 'standalone', method: 'ach', lastFour: '4242' },
    };

    expect(matchesPaymentTextSearch(cardPayment, search)).toBe(true);
    expect(matchesPaymentTextSearch(numericEmailTrap, search)).toBe(false);
    expect(matchesPaymentTextSearch(standaloneLastFour, search)).toBe(false);
    expect(matchesPaymentTextSearch(cardPayment, createPaymentTextSearch('424'))).toBe(false);
  });

  it.each([null, '', '   '])('treats %j as an empty search that matches every payment', (value) => {
    expect(matchesPaymentTextSearch(cardPayment, createPaymentTextSearch(value))).toBe(true);
  });

  it('returns no match when the routed field does not start with the search value', () => {
    expect(
      matchesPaymentTextSearch(cardPayment, createPaymentTextSearch('nobody@example.com')),
    ).toBe(false);
    expect(matchesPaymentTextSearch(cardPayment, createPaymentTextSearch('9999'))).toBe(false);
    expect(matchesPaymentTextSearch(cardPayment, createPaymentTextSearch('pay_unknown'))).toBe(
      false,
    );
  });
});
