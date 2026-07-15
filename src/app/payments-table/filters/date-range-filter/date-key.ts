interface DateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

export function dateKeyInTimeZone(timestamp: number | string, timeZone: string): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    throw new Error('The date range timestamp must be valid.');
  }

  const formatter = getDateFormatter(timeZone);
  let year = '';
  let month = '';
  let day = '';

  for (const part of formatter.formatToParts(date)) {
    switch (part.type) {
      case 'year':
        year = part.value;
        break;
      case 'month':
        month = part.value;
        break;
      case 'day':
        day = part.value;
        break;
    }
  }

  if (!year || !month || !day) {
    throw new Error('The date range formatter did not return a complete date.');
  }

  return `${year}-${month}-${day}`;
}

export function startOfDateKeyMonth(date: string): string {
  const { year, month } = parseDateKey(date);
  return createDateKey({ year, month, day: 1 });
}

export function addDateKeyDays(date: string, amount: number): string {
  const nextDate = dateKeyToUtcDate(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + amount);
  return utcDateToKey(nextDate);
}

export function addDateKeyMonths(date: string, amount: number): string {
  const { year, month, day } = parseDateKey(date);
  const targetMonth = new Date(Date.UTC(year, month - 1 + amount, 1));
  const targetYear = targetMonth.getUTCFullYear();
  const targetMonthNumber = targetMonth.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(targetYear, targetMonthNumber, 0)).getUTCDate();

  return createDateKey({
    year: targetYear,
    month: targetMonthNumber,
    day: Math.min(day, lastDay),
  });
}

export function startOfDateKeyWeek(date: string): string {
  const weekday = dateKeyToUtcDate(date).getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;
  return addDateKeyDays(date, -daysSinceMonday);
}

export function endOfDateKeyWeek(date: string): string {
  return addDateKeyDays(startOfDateKeyWeek(date), 6);
}

export function dateKeyToUtcDate(date: string): Date {
  const { year, month, day } = parseDateKey(date);
  return new Date(Date.UTC(year, month - 1, day));
}

export function parseDateKey(date: string): DateParts {
  const match = DATE_KEY_PATTERN.exec(date);

  if (!match) {
    throw new Error('The date range value must use YYYY-MM-DD.');
  }

  const parts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
  const parsedDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));

  if (utcDateToComparableParts(parsedDate) !== date) {
    throw new Error('The date range value must be a valid calendar date.');
  }

  return parts;
}

function getDateFormatter(timeZone: string): Intl.DateTimeFormat {
  const existingFormatter = DATE_FORMATTERS.get(timeZone);

  if (existingFormatter) {
    return existingFormatter;
  }

  const formatter = new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  });

  DATE_FORMATTERS.set(timeZone, formatter);
  return formatter;
}

function utcDateToKey(date: Date): string {
  return createDateKey({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  });
}

function createDateKey({ year, month, day }: DateParts): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function utcDateToComparableParts(date: Date): string {
  return `${String(date.getUTCFullYear()).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}
