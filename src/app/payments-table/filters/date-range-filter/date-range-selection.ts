import { addDateKeyDays, dateKeyInTimeZone, parseDateKey } from './date-key';

export type DateRangePreset = 'today' | 'last-7-days' | 'last-30-days' | 'custom';
export type QuickDateRangePreset = Exclude<DateRangePreset, 'custom'>;

export interface DateRangeSelection {
  readonly preset: DateRangePreset;
  readonly start: string;
  readonly end: string;
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
