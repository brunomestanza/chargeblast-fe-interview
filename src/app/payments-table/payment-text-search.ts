import type { Payment } from './payment';

type PaymentTextSearch =
  | { readonly field: 'card-last-four'; readonly value: string }
  | { readonly field: 'id'; readonly value: string }
  | { readonly field: 'email'; readonly value: string };

const NUMERIC_SEARCH_PATTERN = /^\d+$/;

export function createPaymentTextSearch(value: string | null): PaymentTextSearch | null {
  const normalizedValue = value?.trim().toLowerCase();

  if (!normalizedValue) {
    return null;
  }

  if (NUMERIC_SEARCH_PATTERN.test(normalizedValue)) {
    return { field: 'card-last-four', value: normalizedValue };
  }

  if (normalizedValue.startsWith('pay')) {
    return { field: 'id', value: normalizedValue };
  }

  return { field: 'email', value: normalizedValue };
}

export function matchesPaymentTextSearch(
  payment: Payment,
  search: PaymentTextSearch | null,
): boolean {
  if (search === null) {
    return true;
  }

  switch (search.field) {
    case 'card-last-four':
      return (
        payment.paymentMethod.kind === 'card' && payment.paymentMethod.lastFour === search.value
      );
    case 'id':
      return payment.id.toLowerCase().startsWith(search.value);
    case 'email':
      return payment.customer.toLowerCase().startsWith(search.value);
  }
}
