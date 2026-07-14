import paymentsFixture from '../../../../../public/data/payments.json';
import { parsePaymentFixture } from '../../payment-mock';
import { paymentMethodFilterValue } from './payment-method-filter-match';
import {
  PAYMENT_METHOD_FILTER_GROUPS,
  isPaymentMethodFilterValue,
  paymentMethodFilterLabel,
} from './payment-method-filter-options.mock';

describe('payment method filter mock', () => {
  it('exposes every supported option once in four semantic groups', () => {
    const options: { readonly value: string; readonly label: string }[] = [];

    for (const group of PAYMENT_METHOD_FILTER_GROUPS) {
      options.push(...group.options);
    }

    expect(PAYMENT_METHOD_FILTER_GROUPS.map((group) => group.label)).toEqual([
      'Card',
      'Wallet',
      'ACH and bank payments',
      'Services',
    ]);
    expect(options.map((option) => option.value)).toEqual([
      'card:visa',
      'card:mastercard',
      'card:amex',
      'card:discover',
      'card:diners-club',
      'card:jcb',
      'card:unionpay',
      'card:elo',
      'wallet:apple-pay',
      'wallet:google-pay',
      'wallet:link',
      'method:ach',
      'method:sepa',
      'method:ideal',
      'method:pix',
      'method:boleto',
      'method:paypal',
      'method:cash-app-pay',
      'method:klarna',
      'method:afterpay',
    ]);
    expect(new Set(options.map((option) => option.value)).size).toBe(20);
  });

  it('guards values and resolves their interface labels', () => {
    expect(isPaymentMethodFilterValue('wallet:google-pay')).toBe(true);
    expect(isPaymentMethodFilterValue('method:unknown')).toBe(false);
    expect(paymentMethodFilterLabel('card:amex')).toBe('American Express');
    expect(paymentMethodFilterLabel('method:ach')).toBe('ACH Direct Debit');
  });

  it('covers every payment method present in the payment fixture', () => {
    const mockedValues = new Set<string>();

    for (const group of PAYMENT_METHOD_FILTER_GROUPS) {
      for (const option of group.options) {
        mockedValues.add(option.value);
      }
    }

    const fixtureValues = parsePaymentFixture(paymentsFixture).map((payment) =>
      paymentMethodFilterValue(payment.paymentMethod),
    );

    expect(fixtureValues).not.toContain(null);
    expect([...new Set(fixtureValues)].sort()).toEqual([...mockedValues].sort());
  });
});
