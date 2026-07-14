import { Payment } from './payment';
import { createPaymentsCsvFilename, serializePaymentsCsv } from './payment-csv';

const cardPayment: Payment = {
  id: 'pay_"quoted"',
  customer: '=2+3',
  amount: 249.5,
  currency: 'USD',
  status: 'succeeded',
  paymentMethod: {
    kind: 'card',
    brand: 'visa',
    wallet: 'apple-pay',
    lastFour: '4242',
  },
  createdAt: '2026-07-13T14:48:00-03:00',
};

const standalonePayment: Payment = {
  id: 'pay_standalone',
  customer: 'Zoë, "Finance"\nteam@example.com',
  amount: 18_832.5,
  currency: 'JPY',
  status: 'refunded',
  paymentMethod: {
    kind: 'standalone',
    method: 'ach',
    lastFour: '6789',
  },
  createdAt: '2026-07-12T11:00:00.000Z',
};

describe('payments CSV serialization', () => {
  it('flattens every payment field into stable English columns', () => {
    const csv = serializePaymentsCsv([cardPayment, standalonePayment]);
    const rows = csv.slice(1).split('\r\n');

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(rows[0]).toBe(
      '"Payment ID","Customer","Amount","Currency","Status","Payment method type",' +
        '"Card brand","Wallet","Payment method","Last four","Created at"',
    );
    expect(rows[1]).toBe(
      '"pay_""quoted""","\'=2+3","249.5","USD","succeeded","card","visa",' +
        '"apple-pay","","4242","2026-07-13T14:48:00-03:00"',
    );
    expect(rows[2]).toContain('"pay_standalone"');
    expect(rows[2]).toContain('"standalone","","","ach","6789"');
    expect(rows[2]).toContain('"18832.5","JPY","refunded"');
  });

  it('escapes commas, quotes, newlines, Unicode, and spreadsheet formulas', () => {
    const csv = serializePaymentsCsv([standalonePayment, cardPayment]);

    expect(csv).toContain('"Zoë, ""Finance""\nteam@example.com"');
    expect(csv).toContain('"\'=2+3"');
    expect(csv.indexOf('pay_standalone')).toBeLessThan(csv.indexOf('pay_""quoted""'));
  });

  it.each(['=1+1', '+cmd', '-10+20', '@SUM(A1:A2)', '\t=1+1', '  =1+1'])(
    'neutralizes the spreadsheet formula prefix in %j',
    (customer) => {
      const csv = serializePaymentsCsv([{ ...cardPayment, customer }]);

      expect(csv).toContain(`"'${customer}"`);
    },
  );

  it('keeps a negative numeric amount machine-readable', () => {
    const csv = serializePaymentsCsv([{ ...cardPayment, amount: -12.5 }]);

    expect(csv).toContain('"-12.5"');
    expect(csv).not.toContain('"\'-12.5"');
  });

  it('exports a header-only document when the current view is empty', () => {
    const csv = serializePaymentsCsv([]);

    expect(csv.startsWith('\uFEFF"Payment ID","Customer"')).toBe(true);
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(csv.slice(1).split('\r\n')).toHaveLength(2);
  });

  it('uses an ISO date in the download filename', () => {
    expect(createPaymentsCsvFilename(new Date('2026-07-14T22:30:00.000Z'))).toBe(
      'payments-2026-07-14.csv',
    );
  });
});
