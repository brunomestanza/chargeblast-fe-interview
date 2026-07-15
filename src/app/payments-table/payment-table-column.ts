export const PAYMENT_TABLE_COLUMN_KEYS = [
  'paymentId',
  'customer',
  'amount',
  'status',
  'paymentMethod',
  'created',
] as const;

export type PaymentTableColumnKey = (typeof PAYMENT_TABLE_COLUMN_KEYS)[number];

export const PAYMENT_TABLE_COLUMN_LABELS: Readonly<Record<PaymentTableColumnKey, string>> = {
  paymentId: 'Payment ID',
  customer: 'Customer',
  amount: 'Amount',
  status: 'Status',
  paymentMethod: 'Payment method',
  created: 'Created',
};
