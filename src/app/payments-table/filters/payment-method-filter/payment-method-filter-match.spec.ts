import type { PaymentMethod } from '../../payment';
import {
  matchesPaymentMethodFilter,
  paymentMethodFilterValue,
} from './payment-method-filter-match';

describe('payment method filter matching', () => {
  it.each([
    [{ kind: 'card', brand: 'visa', lastFour: '4242' }, 'card:visa'],
    [{ kind: 'card', brand: 'visa', wallet: 'google-pay', lastFour: '5454' }, 'wallet:google-pay'],
    [{ kind: 'standalone', method: 'ach', lastFour: '6789' }, 'method:ach'],
    [{ kind: 'standalone', method: 'paypal' }, 'method:paypal'],
  ] satisfies readonly (readonly [PaymentMethod, string])[])(
    'maps %o to %s',
    (method, expected) => {
      expect(paymentMethodFilterValue(method)).toBe(expected);
    },
  );

  it('keeps wallets exclusive from their funding card brand', () => {
    const googlePayVisa: PaymentMethod = {
      kind: 'card',
      brand: 'visa',
      wallet: 'google-pay',
      lastFour: '5454',
    };

    expect(matchesPaymentMethodFilter(googlePayVisa, ['card:visa'])).toBe(false);
    expect(matchesPaymentMethodFilter(googlePayVisa, ['wallet:google-pay'])).toBe(true);
  });

  it('matches selected values with OR semantics and treats no selection as unfiltered', () => {
    const paypal: PaymentMethod = { kind: 'standalone', method: 'paypal' };

    expect(matchesPaymentMethodFilter(paypal, [])).toBe(true);
    expect(matchesPaymentMethodFilter(paypal, ['card:visa', 'method:paypal'])).toBe(true);
    expect(matchesPaymentMethodFilter(paypal, ['card:visa', 'method:ach'])).toBe(false);
  });

  it('does not match unsupported values when a filter is active', () => {
    const unsupported: PaymentMethod = { kind: 'standalone', method: 'wire-transfer' };

    expect(paymentMethodFilterValue(unsupported)).toBeNull();
    expect(matchesPaymentMethodFilter(unsupported, ['method:ach'])).toBe(false);
  });
});
