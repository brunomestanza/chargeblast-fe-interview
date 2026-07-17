export const PAYMENT_TABLE_COLUMN_KEYS = [
  'amount',
  'paymentMethod',
  'description',
  'customer',
  'created',
  'refundedDate',
  'declineReason',
] as const;

export type PaymentTableColumnKey = (typeof PAYMENT_TABLE_COLUMN_KEYS)[number];

export const PAYMENT_TABLE_COLUMN_LABELS: Readonly<Record<PaymentTableColumnKey, string>> = {
  amount: 'Amount',
  paymentMethod: 'Payment method',
  description: 'Description',
  customer: 'Customer',
  created: 'Date',
  refundedDate: 'Refunded date',
  declineReason: 'Decline reason',
};
