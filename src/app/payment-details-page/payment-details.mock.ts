export interface PaymentActivityItem {
  readonly kind: 'failed' | 'started';
  readonly title: string;
  readonly actionLabel?: string;
  readonly description?: string;
  readonly occurredAt: string;
  readonly occurredLabel: string;
}

export interface PaymentDetailsFixture {
  readonly amount: string;
  readonly currency: string;
  readonly status: 'Failed';
  readonly paymentId: string;
  readonly description: string;
  readonly statementDescriptor: string;
  readonly createdAt: string;
  readonly createdLabel: string;
  readonly updatedAt: string;
  readonly updatedLabel: string;
  readonly riskEvaluation: string;
  readonly failureCode: string;
  readonly networkDeclineCode: string;
  readonly customer: {
    readonly id: string;
    readonly name: string;
    readonly email: string;
    readonly phone: string;
    readonly country: string;
  };
  readonly paymentMethod: {
    readonly id: string;
    readonly brand: string;
    readonly summary: string;
    readonly number: string;
    readonly fingerprint: string;
    readonly expires: string;
    readonly type: string;
    readonly issuer: string;
    readonly owner: string;
    readonly ownerEmail: string;
    readonly address: string;
    readonly origin: string;
    readonly zipCheck: string;
  };
  readonly breakdown: {
    readonly paymentAmount: string;
    readonly fees: string;
    readonly netAmount: string;
  };
  readonly activity: readonly PaymentActivityItem[];
}

export const PAYMENT_DETAILS_FIXTURE = {
  amount: '£34.99',
  currency: 'GBP',
  status: 'Failed',
  paymentId: 'pi_3JkvRcA5MgunUWVePmAl2PC',
  description: 'Subscription update',
  statementDescriptor: 'CRAMLY AI',
  createdAt: '2023-08-13T07:01:00-03:00',
  createdLabel: 'Aug 13, 7:01 AM',
  updatedAt: '2023-08-16T15:43:00-03:00',
  updatedLabel: 'Aug 16, 3:43 PM',
  riskEvaluation: 'Normal',
  failureCode: 'card_declined',
  networkDeclineCode: '59',
  customer: {
    id: 'cus_Qeeh7Kx5wSsv25',
    name: 'Sophia Charles',
    email: 'sophiamarlea87@gmail.com',
    phone: '—',
    country: 'United Kingdom',
  },
  paymentMethod: {
    id: 'pm_1Pjk04A5MgunUWVeDhqyYrsR',
    brand: 'visa',
    summary: 'Visa •••• 1453',
    number: '•••• 1453',
    fingerprint: 'VFKbN7YYx9hJyu2Z',
    expires: '09 / 2028',
    type: 'Visa debit card',
    issuer: 'REVOLUT LIMITED',
    owner: 'Sophia Charles',
    ownerEmail: 'sophiamarlea87@gmail.com',
    address: 'RM83HL, GB',
    origin: 'United Kingdom',
    zipCheck: 'Unavailable',
  },
  breakdown: {
    paymentAmount: '£34.99 GBP',
    fees: '£0.00 GBP',
    netAmount: '£0.00 GBP',
  },
  activity: [
    {
      kind: 'failed',
      title: 'Payment attempt with Visa •••• 1453 was declined',
      actionLabel: 'Optimize your payment recovery',
      description:
        'The bank returned the decline code do_not_honor and did not provide any other information. We recommend that your customer contact their card issuer, REVOLUT LIMITED, for more information, or use another payment method.',
      occurredAt: '2023-08-16T15:43:00-03:00',
      occurredLabel: 'Aug 16, 2023, 3:43 PM',
    },
    {
      kind: 'failed',
      title: 'Failed payment with Visa •••• 1453',
      description:
        'The bank returned the decline code do_not_honor and did not provide any other information. The payment remains incomplete.',
      occurredAt: '2023-08-16T08:57:00-03:00',
      occurredLabel: 'Aug 16, 2023, 8:57 AM',
    },
    {
      kind: 'started',
      title: 'Payment started',
      occurredAt: '2023-08-13T07:01:00-03:00',
      occurredLabel: 'Aug 13, 2023, 7:01 AM',
    },
  ],
} as const satisfies PaymentDetailsFixture;
