import type { Payment, PaymentMethod, PaymentStatus } from './payment';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPaymentStatus(value: unknown): value is PaymentStatus {
  return value === 'succeeded' || value === 'pending' || value === 'failed' || value === 'refunded';
}

function isLastFour(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}$/.test(value);
}

function isPaymentMethod(value: unknown): value is PaymentMethod {
  if (!isRecord(value)) {
    return false;
  }

  if (value['kind'] === 'card') {
    return (
      typeof value['brand'] === 'string' &&
      isLastFour(value['lastFour']) &&
      (value['wallet'] === undefined || typeof value['wallet'] === 'string')
    );
  }

  if (value['kind'] === 'standalone') {
    return (
      typeof value['method'] === 'string' &&
      (value['lastFour'] === undefined || isLastFour(value['lastFour']))
    );
  }

  return false;
}

function isPayment(value: unknown): value is Payment {
  if (!isRecord(value)) {
    return false;
  }

  const createdAt = value['createdAt'];

  return (
    typeof value['id'] === 'string' &&
    value['id'].startsWith('pay_') &&
    typeof value['customer'] === 'string' &&
    value['customer'].includes('@') &&
    typeof value['amount'] === 'number' &&
    Number.isFinite(value['amount']) &&
    value['amount'] > 0 &&
    typeof value['currency'] === 'string' &&
    /^[A-Z]{3}$/.test(value['currency']) &&
    isPaymentStatus(value['status']) &&
    isPaymentMethod(value['paymentMethod']) &&
    typeof createdAt === 'string' &&
    !Number.isNaN(Date.parse(createdAt))
  );
}

export function parsePaymentData(value: unknown): readonly Payment[] {
  if (!Array.isArray(value)) {
    throw new Error('The payment data must be an array.');
  }

  const rows: readonly unknown[] = value;
  const payments = rows.filter(isPayment);

  if (payments.length !== rows.length) {
    throw new Error('The payment data contains an invalid payment.');
  }

  const uniquePaymentIds = new Set(payments.map((payment) => payment.id));

  if (uniquePaymentIds.size !== payments.length) {
    throw new Error('The payment data contains duplicate payment IDs.');
  }

  return payments;
}

export function rebasePaymentDates(
  payments: readonly Payment[],
  referenceTime: number,
): readonly Payment[] {
  if (payments.length === 0) {
    return payments;
  }

  if (Number.isNaN(new Date(referenceTime).getTime())) {
    throw new Error('The payment date reference must be valid.');
  }

  const paymentTimes = payments.map((payment) => Date.parse(payment.createdAt));

  if (paymentTimes.some(Number.isNaN)) {
    throw new Error('Every payment date must be valid.');
  }

  const newestPaymentTime = Math.max(...paymentTimes);
  const dateOffset = referenceTime - newestPaymentTime;

  return payments.map((payment, index) => ({
    ...payment,
    createdAt: new Date(paymentTimes[index] + dateOffset).toISOString(),
  }));
}
