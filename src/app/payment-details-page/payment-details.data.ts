import paymentData from '../../../public/data/payments.json';
import {
  PAYMENT_STATUS_LABELS,
  type Payment,
  type PaymentMethod,
  type PaymentStatus,
} from '../payments/payment';
import { parsePaymentData } from '../payments/payment-data';
import type { PaymentIconCategory } from '../payments/payment-method-icon.catalog';
import {
  formatCreatedDate,
  formatCreatedTime,
  formatCurrencyAmount,
} from '../payments-table/payment-display-format';

export interface PaymentActivityItem {
  readonly kind: 'failed' | 'started';
  readonly title: string;
  readonly actionLabel?: string;
  readonly description?: string;
  readonly occurredAt: string;
  readonly occurredShortLabel: string;
  readonly occurredLabel: string;
}

export interface PaymentEventItem {
  readonly description: string;
  readonly occurredAt: string;
  /** Full timestamp Stripe uses in the event log, e.g. "8/16/23, 3:43:00 PM". */
  readonly occurredLabel: string;
}

export interface PaymentLogItem {
  readonly method: string;
  readonly endpoint: string;
  readonly status: string;
  readonly ok: boolean;
  readonly occurredAt: string;
  readonly occurredLabel: string;
}

export interface PaymentDetailsData {
  readonly amount: string;
  readonly currency: string;
  readonly status: string;
  readonly statusVariant: PaymentStatus;
  readonly paymentId: string;
  readonly description: string;
  readonly statementDescriptor: string;
  readonly createdAt: string;
  readonly createdLabel: string;
  readonly updatedAt: string;
  readonly updatedLabel: string;
  readonly fundsAvailable: string;
  readonly riskEvaluation: string;
  readonly failureCode: string;
  readonly networkDeclineCode: string;
  readonly customer: {
    readonly id: string;
    readonly name: string;
    readonly email: string;
    readonly phone: string;
    readonly country: string;
    readonly isGuest: boolean;
  };
  readonly paymentMethod: {
    readonly id: string;
    readonly iconCategory: PaymentIconCategory;
    readonly iconKey: string;
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
  readonly events: readonly PaymentEventItem[];
  readonly logs: readonly PaymentLogItem[];
}

const BRAND_LABELS: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  'diners-club': 'Diners Club',
  jcb: 'JCB',
  unionpay: 'UnionPay',
  elo: 'Elo',
};

const METHOD_LABELS: Record<string, string> = {
  ach: 'ACH Direct Debit',
  sepa: 'SEPA Direct Debit',
  ideal: 'iDEAL',
  pix: 'Pix',
  boleto: 'Boleto',
  paypal: 'PayPal',
  'cash-app-pay': 'Cash App Pay',
  klarna: 'Klarna',
  afterpay: 'Afterpay',
};

const COUNTRY_BY_CURRENCY: Record<string, string> = {
  USD: 'United States',
  EUR: 'Germany',
  GBP: 'United Kingdom',
  BRL: 'Brazil',
  CAD: 'Canada',
  CHF: 'Switzerland',
  JPY: 'Japan',
  CNY: 'China',
  SEK: 'Sweden',
  AUD: 'Australia',
};

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

function titleCase(value: string): string {
  return value
    .split(/[.\-_+\s]/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function deriveCustomerName(email: string): string {
  const local = email.split('@')[0] ?? email;
  const parts = local.split(/[.\-_+]/).filter((part) => part.length > 0 && !/^\d+$/.test(part));
  return parts.length > 0 ? parts.map((part) => titleCase(part)).join(' ') : email;
}

function brandLabel(brand: string): string {
  return BRAND_LABELS[brand] ?? titleCase(brand);
}

function methodLabel(method: string): string {
  return METHOD_LABELS[method] ?? titleCase(method);
}

interface MethodPresentation {
  readonly iconCategory: PaymentIconCategory;
  readonly iconKey: string;
  readonly brand: string;
  readonly number: string;
  readonly summary: string;
  readonly type: string;
}

function describeMethod(paymentMethod: PaymentMethod): MethodPresentation {
  if (paymentMethod.kind === 'card') {
    const label = brandLabel(paymentMethod.brand);
    return {
      iconCategory: 'card-brand',
      iconKey: paymentMethod.brand,
      brand: paymentMethod.brand,
      number: `•••• ${paymentMethod.lastFour}`,
      summary: `${label} •••• ${paymentMethod.lastFour}`,
      type: `${label} card`,
    };
  }

  const label = methodLabel(paymentMethod.method);
  return {
    iconCategory: 'method',
    iconKey: paymentMethod.method,
    brand: paymentMethod.method,
    number: paymentMethod.lastFour ? `•••• ${paymentMethod.lastFour}` : label,
    summary: label,
    type: label,
  };
}

interface Stamp {
  readonly iso: string;
  readonly short: string;
  readonly long: string;
}

function stamp(iso: string, timeZone: string): Stamp {
  const date = formatCreatedDate(iso, timeZone);
  const time = formatCreatedTime(iso, timeZone);
  return { iso, short: `${date} ${time}`, long: `${date}, ${time}` };
}

function shift(iso: string, deltaMs: number): string {
  return new Date(Date.parse(iso) + deltaMs).toISOString();
}

function computeFee(amount: number, currency: string): string {
  const fee = Math.round((amount * 0.029 + 0.3) * 100) / 100;
  return `${formatCurrencyAmount(fee, currency)} ${currency}`;
}

function zeroAmount(currency: string): string {
  return `${formatCurrencyAmount(0, currency)} ${currency}`;
}

interface Timeline {
  readonly activity: readonly PaymentActivityItem[];
  readonly events: readonly PaymentEventItem[];
  readonly logs: readonly PaymentLogItem[];
  readonly failureCode: string;
  readonly networkDeclineCode: string;
  readonly fundsAvailable: string;
  readonly riskEvaluation: string;
}

interface TimelineContext {
  readonly id: string;
  readonly amountLabel: string;
  readonly methodSummary: string;
  readonly created: Stamp;
  readonly outcome: Stamp;
  readonly declineReason: string;
  readonly timeZone: string;
}

function buildTimeline(status: PaymentStatus, ctx: TimelineContext): Timeline {
  const { id, amountLabel, methodSummary, created, outcome } = ctx;
  const startedItem: PaymentActivityItem = {
    kind: 'started',
    title: 'Payment started',
    occurredAt: created.iso,
    occurredShortLabel: created.short,
    occurredLabel: created.long,
  };
  const createdEvent: PaymentEventItem = {
    description: `A new payment ${id} for ${amountLabel} was created`,
    occurredAt: created.iso,
    occurredLabel: created.long,
  };
  const confirmEndpoint = `/v1/payment_intents/${id}/confirm`;

  switch (status) {
    case 'succeeded':
      return {
        activity: [
          {
            kind: 'started',
            title: `Payment succeeded with ${methodSummary}`,
            occurredAt: outcome.iso,
            occurredShortLabel: outcome.short,
            occurredLabel: outcome.long,
          },
          startedItem,
        ],
        events: [
          {
            description: `The payment ${id} for ${amountLabel} succeeded`,
            occurredAt: outcome.iso,
            occurredLabel: outcome.long,
          },
          createdEvent,
        ],
        logs: [logEntry('POST', confirmEndpoint, '200 OK', true, outcome)],
        failureCode: '—',
        networkDeclineCode: '—',
        fundsAvailable: stamp(shift(outcome.iso, 2 * DAY), ctx.timeZone).short,
        riskEvaluation: 'Normal',
      };

    case 'refunded': {
      const succeeded = stamp(shift(created.iso, 3 * MINUTE), ctx.timeZone);
      return {
        activity: [
          {
            kind: 'started',
            title: `Payment refunded to ${methodSummary}`,
            description: 'The full amount was refunded to the original payment method.',
            occurredAt: outcome.iso,
            occurredShortLabel: outcome.short,
            occurredLabel: outcome.long,
          },
          {
            kind: 'started',
            title: `Payment succeeded with ${methodSummary}`,
            occurredAt: succeeded.iso,
            occurredShortLabel: succeeded.short,
            occurredLabel: succeeded.long,
          },
          startedItem,
        ],
        events: [
          {
            description: `The payment ${id} for ${amountLabel} was refunded`,
            occurredAt: outcome.iso,
            occurredLabel: outcome.long,
          },
          {
            description: `The payment ${id} for ${amountLabel} succeeded`,
            occurredAt: succeeded.iso,
            occurredLabel: succeeded.long,
          },
          createdEvent,
        ],
        logs: [logEntry('POST', `/v1/refunds`, '200 OK', true, outcome)],
        failureCode: '—',
        networkDeclineCode: '—',
        fundsAvailable: '—',
        riskEvaluation: 'Normal',
      };
    }

    case 'uncaptured':
      return {
        activity: [
          {
            kind: 'started',
            title: `Payment authorized with ${methodSummary}`,
            description: 'The funds are reserved but have not been captured yet.',
            occurredAt: outcome.iso,
            occurredShortLabel: outcome.short,
            occurredLabel: outcome.long,
          },
          startedItem,
        ],
        events: [
          {
            description: `A payment ${id} for ${amountLabel} was authorized and requires capture`,
            occurredAt: outcome.iso,
            occurredLabel: outcome.long,
          },
          createdEvent,
        ],
        logs: [logEntry('POST', confirmEndpoint, '200 OK', true, outcome)],
        failureCode: '—',
        networkDeclineCode: '—',
        fundsAvailable: '—',
        riskEvaluation: 'Normal',
      };

    case 'disputed': {
      const succeeded = stamp(shift(created.iso, 3 * MINUTE), ctx.timeZone);
      return {
        activity: [
          {
            kind: 'failed',
            title: 'Payment disputed by the customer',
            actionLabel: 'Respond to this dispute',
            description:
              'The customer disputed this payment with their bank. Submit evidence before the response deadline to challenge it.',
            occurredAt: outcome.iso,
            occurredShortLabel: outcome.short,
            occurredLabel: outcome.long,
          },
          {
            kind: 'started',
            title: `Payment succeeded with ${methodSummary}`,
            occurredAt: succeeded.iso,
            occurredShortLabel: succeeded.short,
            occurredLabel: succeeded.long,
          },
          startedItem,
        ],
        events: [
          {
            description: `The payment ${id} for ${amountLabel} was disputed`,
            occurredAt: outcome.iso,
            occurredLabel: outcome.long,
          },
          {
            description: `The payment ${id} for ${amountLabel} succeeded`,
            occurredAt: succeeded.iso,
            occurredLabel: succeeded.long,
          },
          createdEvent,
        ],
        logs: [logEntry('POST', confirmEndpoint, '200 OK', true, succeeded)],
        failureCode: '—',
        networkDeclineCode: '—',
        fundsAvailable: '—',
        riskEvaluation: 'Elevated',
      };
    }

    case 'canceled':
      return {
        activity: [
          {
            kind: 'started',
            title: 'Payment canceled',
            description: 'This payment was canceled before it was captured.',
            occurredAt: outcome.iso,
            occurredShortLabel: outcome.short,
            occurredLabel: outcome.long,
          },
          startedItem,
        ],
        events: [
          {
            description: `The payment ${id} for ${amountLabel} was canceled`,
            occurredAt: outcome.iso,
            occurredLabel: outcome.long,
          },
          createdEvent,
        ],
        logs: [logEntry('POST', `/v1/payment_intents/${id}/cancel`, '200 OK', true, outcome)],
        failureCode: '—',
        networkDeclineCode: '—',
        fundsAvailable: '—',
        riskEvaluation: 'Normal',
      };

    case 'failed':
    case 'blocked':
    default: {
      const blocked = status === 'blocked';
      const failureCode = blocked ? 'card_blocked' : 'card_declined';
      const declineDescription = blocked
        ? `This payment was blocked by a Radar rule (${ctx.declineReason}). No charge was made and the customer was not notified.`
        : `The bank returned the decline code ${ctx.declineReason} and did not provide any other information. We recommend that your customer contact their card issuer for more information, or use another payment method.`;
      const midDecline = stamp(shift(created.iso, 2 * MINUTE), ctx.timeZone);
      return {
        activity: [
          {
            kind: 'failed',
            title: blocked
              ? `Payment with ${methodSummary} was blocked`
              : `Payment attempt with ${methodSummary} was declined`,
            actionLabel: blocked ? undefined : 'Optimize your payment recovery',
            description: declineDescription,
            occurredAt: outcome.iso,
            occurredShortLabel: outcome.short,
            occurredLabel: outcome.long,
          },
          {
            kind: 'failed',
            title: `Failed payment with ${methodSummary}`,
            description: 'The payment remains incomplete.',
            occurredAt: midDecline.iso,
            occurredShortLabel: midDecline.short,
            occurredLabel: midDecline.long,
          },
          startedItem,
        ],
        events: [
          {
            description: `A payment attempt on ${id} for ${amountLabel} was ${blocked ? 'blocked' : 'declined'}`,
            occurredAt: outcome.iso,
            occurredLabel: outcome.long,
          },
          {
            description: `The payment ${id} for ${amountLabel} failed`,
            occurredAt: midDecline.iso,
            occurredLabel: midDecline.long,
          },
          createdEvent,
        ],
        logs: [logEntry('POST', confirmEndpoint, '402 ERR', false, outcome)],
        failureCode,
        networkDeclineCode: blocked ? '—' : '59',
        fundsAvailable: '—',
        riskEvaluation: blocked ? 'Highest' : 'Normal',
      };
    }
  }
}

function logEntry(
  method: string,
  endpoint: string,
  status: string,
  ok: boolean,
  when: Stamp,
): PaymentLogItem {
  return {
    method,
    endpoint,
    status,
    ok,
    occurredAt: when.iso,
    occurredLabel: when.long,
  };
}

export function buildPaymentDetails(payment: Payment, timeZone: string): PaymentDetailsData {
  const status = payment.status;
  const currency = payment.currency;
  const amount = formatCurrencyAmount(payment.amount, currency);
  const amountLabel = `${amount} ${currency}`;
  const email = payment.customer;
  const name = deriveCustomerName(email);
  const country = COUNTRY_BY_CURRENCY[currency] ?? '—';
  const method = describeMethod(payment.paymentMethod);
  const description = payment.description ?? 'Payment';

  const created = stamp(payment.createdAt, timeZone);
  const outcomeIso =
    payment.refundedAt ?? shift(payment.createdAt, status === 'uncaptured' ? 0 : 4 * MINUTE);
  const outcome = stamp(outcomeIso, timeZone);

  const timeline = buildTimeline(status, {
    id: payment.id,
    amountLabel,
    methodSummary: method.summary,
    created,
    outcome,
    declineReason: payment.declineReason ?? 'do_not_honor',
    timeZone,
  });

  const paymentAmount = amountLabel;
  const fees =
    status === 'succeeded' || status === 'refunded'
      ? computeFee(payment.amount, currency)
      : zeroAmount(currency);
  const netAmount =
    status === 'succeeded'
      ? `${formatCurrencyAmount(payment.amount - Math.round((payment.amount * 0.029 + 0.3) * 100) / 100, currency)} ${currency}`
      : zeroAmount(currency);

  return {
    amount,
    currency,
    status: PAYMENT_STATUS_LABELS[status],
    statusVariant: status,
    paymentId: payment.id,
    description,
    statementDescriptor: 'CHARGEBLAST',
    createdAt: created.iso,
    createdLabel: created.short,
    updatedAt: outcome.iso,
    updatedLabel: outcome.short,
    fundsAvailable: timeline.fundsAvailable,
    riskEvaluation: timeline.riskEvaluation,
    failureCode: timeline.failureCode,
    networkDeclineCode: timeline.networkDeclineCode,
    customer: {
      id: `cus_${payment.id.slice(4, 18)}`,
      name,
      email,
      phone: '—',
      country,
      isGuest: true,
    },
    paymentMethod: {
      id: `pm_${payment.id.slice(4)}`,
      iconCategory: method.iconCategory,
      iconKey: method.iconKey,
      brand: method.brand,
      summary: method.summary,
      number: method.number,
      fingerprint: payment.id.slice(-16),
      expires: '09 / 2028',
      type: method.type,
      issuer: 'STRIPE TEST BANK',
      owner: name,
      ownerEmail: email,
      address: country,
      origin: country,
      zipCheck: 'Unavailable',
    },
    breakdown: {
      paymentAmount,
      fees,
      netAmount,
    },
    activity: timeline.activity,
    events: timeline.events,
    logs: timeline.logs,
  };
}

const PAYMENTS = parsePaymentData(paymentData);
const PAYMENTS_BY_ID = new Map<string, Payment>(PAYMENTS.map((payment) => [payment.id, payment]));

export function resolvePaymentDetails(
  paymentId: string | undefined,
  timeZone: string,
): PaymentDetailsData {
  const payment = (paymentId ? PAYMENTS_BY_ID.get(paymentId) : undefined) ?? PAYMENTS[0];
  return buildPaymentDetails(payment, timeZone);
}
