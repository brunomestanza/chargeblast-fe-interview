import { dateKeyToUtcDate, parseDateKey } from './date-key';
import type { DateRangeSelection } from './date-range-selection';
const MEDIUM_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
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
