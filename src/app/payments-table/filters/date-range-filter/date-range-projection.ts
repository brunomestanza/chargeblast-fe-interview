import {
  addDateKeyDays,
  dateKeyToUtcDate,
  parseDateKey,
  startOfDateKeyMonth,
  startOfDateKeyWeek,
} from './date-key';
import type { DateRangeSelection } from './date-range-selection';

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
