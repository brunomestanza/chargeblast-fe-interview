const CURRENCY_FORMATTERS = new Map<string, Intl.NumberFormat>();
const CREATED_DATE_FORMATTERS = new Map<string, Intl.DateTimeFormat>();
const CREATED_TIME_FORMATTERS = new Map<string, Intl.DateTimeFormat>();
const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat('en-US', { numeric: 'always' });

function getCurrencyFormatter(currency: string): Intl.NumberFormat {
  let formatter = CURRENCY_FORMATTERS.get(currency);

  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    });
    CURRENCY_FORMATTERS.set(currency, formatter);
  }

  return formatter;
}

function getDateFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = CREATED_DATE_FORMATTERS.get(timeZone);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone,
    });
    CREATED_DATE_FORMATTERS.set(timeZone, formatter);
  }

  return formatter;
}

function getTimeFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = CREATED_TIME_FORMATTERS.get(timeZone);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone,
    });
    CREATED_TIME_FORMATTERS.set(timeZone, formatter);
  }

  return formatter;
}

function roundRelativeValue(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

export function formatCurrencyAmount(amount: number, currency: string): string {
  return getCurrencyFormatter(currency).format(amount);
}

export function formatCreatedDate(createdAt: string, timeZone: string): string {
  return getDateFormatter(timeZone).format(new Date(createdAt));
}

export function formatCreatedTime(createdAt: string, timeZone: string): string {
  return getTimeFormatter(timeZone).format(new Date(createdAt));
}

export function formatRelativeTime(createdAt: string, currentTime: number): string {
  const differenceInSeconds = (Date.parse(createdAt) - currentTime) / 1000;
  const absoluteDifference = Math.abs(differenceInSeconds);

  if (absoluteDifference < 45) {
    return 'just now';
  }

  if (absoluteDifference < 60 * 60) {
    return RELATIVE_TIME_FORMATTER.format(roundRelativeValue(differenceInSeconds / 60), 'minute');
  }

  if (absoluteDifference < 60 * 60 * 24) {
    return RELATIVE_TIME_FORMATTER.format(
      roundRelativeValue(differenceInSeconds / (60 * 60)),
      'hour',
    );
  }

  if (absoluteDifference < 60 * 60 * 24 * 30) {
    return RELATIVE_TIME_FORMATTER.format(
      roundRelativeValue(differenceInSeconds / (60 * 60 * 24)),
      'day',
    );
  }

  if (absoluteDifference < 60 * 60 * 24 * 365) {
    return RELATIVE_TIME_FORMATTER.format(
      roundRelativeValue(differenceInSeconds / (60 * 60 * 24 * 30)),
      'month',
    );
  }

  return RELATIVE_TIME_FORMATTER.format(
    roundRelativeValue(differenceInSeconds / (60 * 60 * 24 * 365)),
    'year',
  );
}
