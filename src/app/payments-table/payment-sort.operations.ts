import { convertPaymentAmountToUsdCents } from './exchange-rate';
import type { Payment } from '../payments/payment';
import {
  isDefaultPaymentSort,
  type PaymentSortColumn,
  type PaymentSortCriterion,
} from './payment-sort.contract';

const TEXT_COLLATOR = new Intl.Collator('en-US', {
  numeric: true,
  sensitivity: 'base',
});

export function cyclePaymentSort(
  criteria: readonly PaymentSortCriterion[],
  column: PaymentSortColumn,
): readonly PaymentSortCriterion[] {
  // The default is only an initial fallback; the first explicit column starts its own queue.
  const activeCriteria =
    isDefaultPaymentSort(criteria) && !criteria.some((criterion) => criterion.column === column)
      ? []
      : criteria;
  const criterionIndex = activeCriteria.findIndex((criterion) => criterion.column === column);

  if (criterionIndex === -1) {
    return [...activeCriteria, { column, direction: 'asc' }];
  }

  if (activeCriteria[criterionIndex].direction === 'asc') {
    return activeCriteria.map((criterion, index) =>
      index === criterionIndex ? { ...criterion, direction: 'desc' } : criterion,
    );
  }

  return activeCriteria.filter((_, index) => index !== criterionIndex);
}

export function sortPayments(
  payments: readonly Payment[],
  criteria: readonly PaymentSortCriterion[],
): readonly Payment[] {
  if (criteria.length === 0 || payments.length < 2) {
    return payments;
  }

  return payments
    .map((payment, originalIndex) => ({ payment, originalIndex }))
    .sort((left, right) => {
      for (const criterion of criteria) {
        const comparison = comparePayments(left.payment, right.payment, criterion.column);

        if (comparison !== 0) {
          return criterion.direction === 'asc' ? comparison : -comparison;
        }
      }

      return left.originalIndex - right.originalIndex;
    })
    .map(({ payment }) => payment);
}

function comparePayments(left: Payment, right: Payment, column: PaymentSortColumn): number {
  switch (column) {
    case 'paymentId':
      return TEXT_COLLATOR.compare(left.id, right.id);
    case 'customer':
      return TEXT_COLLATOR.compare(left.customer, right.customer);
    case 'amount':
      return compareAmounts(left, right);
    case 'status':
      return TEXT_COLLATOR.compare(left.status, right.status);
    case 'paymentMethod':
      return comparePaymentMethods(left, right);
    case 'created':
      return Date.parse(left.createdAt) - Date.parse(right.createdAt);
  }
}

function compareAmounts(left: Payment, right: Payment): number {
  const leftUsdCents = convertPaymentAmountToUsdCents(left.amount, left.currency);
  const rightUsdCents = convertPaymentAmountToUsdCents(right.amount, right.currency);

  if (leftUsdCents === null || rightUsdCents === null) {
    // Amounts without a USD equivalent have no comparable value, so they trail the converted ones.
    if (leftUsdCents !== rightUsdCents) {
      return leftUsdCents === null ? 1 : -1;
    }

    return TEXT_COLLATOR.compare(left.currency, right.currency) || left.amount - right.amount;
  }

  return leftUsdCents - rightUsdCents || TEXT_COLLATOR.compare(left.currency, right.currency);
}

function comparePaymentMethods(left: Payment, right: Payment): number {
  const leftValues = paymentMethodSortValues(left);
  const rightValues = paymentMethodSortValues(right);

  for (let index = 0; index < leftValues.length; index += 1) {
    const comparison = TEXT_COLLATOR.compare(leftValues[index], rightValues[index]);

    if (comparison !== 0) {
      return comparison;
    }
  }

  return 0;
}

function paymentMethodSortValues(payment: Payment): readonly [string, string, string] {
  const paymentMethod = payment.paymentMethod;

  if (paymentMethod.kind === 'standalone') {
    return [paymentMethod.method, '', paymentMethod.lastFour ?? ''];
  }

  return [paymentMethod.wallet ?? paymentMethod.brand, paymentMethod.brand, paymentMethod.lastFour];
}
