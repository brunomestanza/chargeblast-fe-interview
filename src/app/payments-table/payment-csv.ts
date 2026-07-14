import type { Payment } from './payment';

export const PAYMENTS_CSV_MIME_TYPE = 'text/csv;charset=utf-8';

const UTF_8_BYTE_ORDER_MARK = '\uFEFF';
const CSV_ROW_SEPARATOR = '\r\n';
const SPREADSHEET_FORMULA_PREFIX = /^[\t\r\n ]*[=+\-@]/;

const PAYMENT_CSV_HEADERS = [
  'Payment ID',
  'Customer',
  'Amount',
  'Currency',
  'Status',
  'Payment method type',
  'Card brand',
  'Wallet',
  'Payment method',
  'Last four',
  'Created at',
] as const;

function escapeCsvCell(value: string | number): string {
  const stringValue = String(value);
  const spreadsheetSafeValue =
    typeof value === 'string' && SPREADSHEET_FORMULA_PREFIX.test(stringValue)
      ? "'" + stringValue
      : stringValue;

  return '"' + spreadsheetSafeValue.replaceAll('"', '""') + '"';
}

function paymentCsvRow(payment: Payment): readonly (string | number)[] {
  const method = payment.paymentMethod;

  return [
    payment.id,
    payment.customer,
    payment.amount,
    payment.currency,
    payment.status,
    method.kind,
    method.kind === 'card' ? method.brand : '',
    method.kind === 'card' ? (method.wallet ?? '') : '',
    method.kind === 'standalone' ? method.method : '',
    method.lastFour ?? '',
    payment.createdAt,
  ];
}

export function serializePaymentsCsv(payments: readonly Payment[]): string {
  const rows = [PAYMENT_CSV_HEADERS, ...payments.map(paymentCsvRow)];
  const csv = rows.map((row) => row.map(escapeCsvCell).join(',')).join(CSV_ROW_SEPARATOR);

  return UTF_8_BYTE_ORDER_MARK + csv + CSV_ROW_SEPARATOR;
}

export function createPaymentsCsvFilename(timestamp: Date): string {
  return `payments-${timestamp.toISOString().slice(0, 10)}.csv`;
}
