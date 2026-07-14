export type DateRangePreset = 'today' | 'last-7-days' | 'last-30-days' | 'custom';
export type QuickDateRangePreset = Exclude<DateRangePreset, 'custom'>;

export interface DateRangeSelection {
  readonly preset: DateRangePreset;
  readonly start: string;
  readonly end: string;
}

export interface CalendarDay {
  readonly date: string;
  readonly dayOfMonth: number;
  readonly label: string;
  readonly inDisplayedMonth: boolean;
  readonly isToday: boolean;
  readonly isRangeStart: boolean;
  readonly isRangeEnd: boolean;
  readonly isInRange: boolean;
}

interface DateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_FORMATTERS = new Map<string, Intl.DateTimeFormat>();
const FULL_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'full',
  timeZone: 'UTC',
});
const MEDIUM_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeZone: 'UTC',
});
const MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const SHORT_MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  timeZone: 'UTC',
});

export const DATE_RANGE_PRESETS: readonly {
  readonly value: DateRangePreset;
  readonly label: string;
}[] = [
  { value: 'today', label: 'Today' },
  { value: 'last-7-days', label: '7d' },
  { value: 'last-30-days', label: '30d' },
  { value: 'custom', label: 'Custom' },
];

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

export function createPresetDateRange(
  preset: QuickDateRangePreset,
  today: string,
): DateRangeSelection {
  const dayCount = preset === 'today' ? 1 : preset === 'last-7-days' ? 7 : 30;

  return {
    preset,
    start: addDateKeyDays(today, -(dayCount - 1)),
    end: today,
  };
}

export function resolveDateRangeForToday(
  selection: DateRangeSelection,
  today: string,
): DateRangeSelection {
  const preset = selection.preset;
  return preset === 'custom' ? selection : createPresetDateRange(preset, today);
}

export function normalizeCustomDateRange(start: string, end: string): DateRangeSelection {
  parseDateKey(start);
  parseDateKey(end);

  return start <= end
    ? { preset: 'custom', start, end }
    : { preset: 'custom', start: end, end: start };
}

export function isTimestampInDateRange(
  timestamp: number | string,
  selection: DateRangeSelection,
  timeZone: string,
): boolean {
  const date = dateKeyInTimeZone(timestamp, timeZone);
  return date >= selection.start && date <= selection.end;
}

export function formatDateRangeLabel(selection: DateRangeSelection): string {
  switch (selection.preset) {
    case 'today':
      return 'Today';
    case 'last-7-days':
      return 'Last 7 days';
    case 'last-30-days':
      return 'Last 30 days';
    case 'custom':
      return formatCompactRange(selection.start, selection.end);
  }
}

export function formatDateRangeSummary(start: string, end: string): string {
  const startLabel = MEDIUM_DATE_FORMATTER.format(dateKeyToUtcDate(start));
  const endLabel = MEDIUM_DATE_FORMATTER.format(dateKeyToUtcDate(end));
  return start === end ? startLabel : `${startLabel} – ${endLabel}`;
}

export function formatMonthLabel(date: string): string {
  return MONTH_FORMATTER.format(dateKeyToUtcDate(startOfDateKeyMonth(date)));
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

export function buildCalendarMonth(
  displayedMonth: string,
  today: string,
  start: string | null,
  end: string | null,
): readonly (readonly CalendarDay[])[] {
  const monthStart = startOfDateKeyMonth(displayedMonth);
  const gridStart = startOfDateKeyWeek(monthStart);
  const monthPrefix = monthStart.slice(0, 7);
  const days = Array.from({ length: 42 }, (_, index): CalendarDay => {
    const date = addDateKeyDays(gridStart, index);
    const { day } = parseDateKey(date);
    const isRangeStart = date === start;
    const isRangeEnd = date === end;
    const isInRange = start !== null && end !== null && date >= start && date <= end;
    const rangeState =
      isRangeStart && isRangeEnd
        ? ', range start and end'
        : isRangeStart
          ? ', range start'
          : isRangeEnd
            ? ', range end'
            : isInRange
              ? ', in selected range'
              : '';

    return {
      date,
      dayOfMonth: day,
      label: FULL_DATE_FORMATTER.format(dateKeyToUtcDate(date)) + rangeState,
      inDisplayedMonth: date.startsWith(monthPrefix),
      isToday: date === today,
      isRangeStart,
      isRangeEnd,
      isInRange,
    };
  });

  return Array.from({ length: 6 }, (_, weekIndex) => days.slice(weekIndex * 7, weekIndex * 7 + 7));
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

function formatCompactRange(start: string, end: string): string {
  const startParts = parseDateKey(start);
  const endParts = parseDateKey(end);
  const startDate = dateKeyToUtcDate(start);
  const endDate = dateKeyToUtcDate(end);

  if (start === end) {
    return MEDIUM_DATE_FORMATTER.format(startDate);
  }

  const startMonth = SHORT_MONTH_FORMATTER.format(startDate);
  const endMonth = SHORT_MONTH_FORMATTER.format(endDate);

  if (startParts.year === endParts.year && startParts.month === endParts.month) {
    return `${startMonth} ${startParts.day}–${endParts.day}, ${startParts.year}`;
  }

  if (startParts.year === endParts.year) {
    return `${startMonth} ${startParts.day} – ${endMonth} ${endParts.day}, ${startParts.year}`;
  }

  return `${startMonth} ${startParts.day}, ${startParts.year} – ${endMonth} ${endParts.day}, ${endParts.year}`;
}

function dateKeyToUtcDate(date: string): Date {
  const { year, month, day } = parseDateKey(date);
  return new Date(Date.UTC(year, month - 1, day));
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

function parseDateKey(date: string): DateParts {
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

function utcDateToComparableParts(date: Date): string {
  return `${String(date.getUTCFullYear()).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}
