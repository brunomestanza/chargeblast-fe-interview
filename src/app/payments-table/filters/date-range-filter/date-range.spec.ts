import {
  addDateKeyDays,
  addDateKeyMonths,
  buildCalendarMonth,
  createPresetDateRange,
  dateKeyInTimeZone,
  formatDateRangeLabel,
  isTimestampInDateRange,
  normalizeCustomDateRange,
  resolveDateRangeForToday,
} from './date-range';

describe('date range utilities', () => {
  it('creates inclusive calendar-day presets', () => {
    expect(createPresetDateRange('today', '2026-03-01')).toEqual({
      preset: 'today',
      start: '2026-03-01',
      end: '2026-03-01',
    });
    expect(createPresetDateRange('last-7-days', '2026-03-01')).toEqual({
      preset: 'last-7-days',
      start: '2026-02-23',
      end: '2026-03-01',
    });
    expect(createPresetDateRange('last-30-days', '2026-03-01')).toEqual({
      preset: 'last-30-days',
      start: '2026-01-31',
      end: '2026-03-01',
    });
  });

  it('refreshes relative presets while keeping custom ranges fixed', () => {
    expect(
      resolveDateRangeForToday(
        { preset: 'today', start: '2026-07-13', end: '2026-07-13' },
        '2026-07-14',
      ),
    ).toEqual({ preset: 'today', start: '2026-07-14', end: '2026-07-14' });

    const custom = normalizeCustomDateRange('2026-07-01', '2026-07-03');
    expect(resolveDateRangeForToday(custom, '2026-07-14')).toBe(custom);
  });

  it('uses civil-date arithmetic across leap days and month boundaries', () => {
    expect(addDateKeyDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDateKeyDays('2024-02-29', 1)).toBe('2024-03-01');
    expect(addDateKeyMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addDateKeyMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addDateKeyMonths('2026-12-14', 1)).toBe('2027-01-14');
  });

  it('compares timestamps as dates in the selected browser time zone', () => {
    const selection = normalizeCustomDateRange('2026-07-13', '2026-07-14');

    expect(dateKeyInTimeZone('2026-07-14T01:30:00Z', 'America/Sao_Paulo')).toBe('2026-07-13');
    expect(isTimestampInDateRange('2026-07-13T03:00:00Z', selection, 'America/Sao_Paulo')).toBe(
      true,
    );
    expect(isTimestampInDateRange('2026-07-15T02:59:59Z', selection, 'America/Sao_Paulo')).toBe(
      true,
    );
    expect(isTimestampInDateRange('2026-07-13T02:59:59Z', selection, 'America/Sao_Paulo')).toBe(
      false,
    );
    expect(isTimestampInDateRange('2026-07-15T03:00:00Z', selection, 'America/Sao_Paulo')).toBe(
      false,
    );
  });

  it('normalizes reverse selections and keeps custom labels compact', () => {
    expect(normalizeCustomDateRange('2026-07-14', '2026-07-02')).toEqual({
      preset: 'custom',
      start: '2026-07-02',
      end: '2026-07-14',
    });
    expect(formatDateRangeLabel(normalizeCustomDateRange('2026-07-02', '2026-07-14'))).toBe(
      'Jul 2–14, 2026',
    );
    expect(formatDateRangeLabel(normalizeCustomDateRange('2026-06-30', '2026-07-02'))).toBe(
      'Jun 30 – Jul 2, 2026',
    );
    expect(formatDateRangeLabel(normalizeCustomDateRange('2025-12-31', '2026-01-02'))).toBe(
      'Dec 31, 2025 – Jan 2, 2026',
    );
  });

  it('builds a fixed six-week Monday-first calendar grid', () => {
    const weeks = buildCalendarMonth('2026-08-01', '2026-08-14', '2026-08-03', '2026-08-07');
    const days = weeks.flat();

    expect(weeks).toHaveLength(6);
    expect(days).toHaveLength(42);
    expect(days[0].date).toBe('2026-07-27');
    expect(days.at(-1)?.date).toBe('2026-09-06');
    expect(days.find((day) => day.date === '2026-08-14')?.isToday).toBe(true);
    expect(days.filter((day) => day.isInRange)).toHaveLength(5);
  });

  it('announces a one-day selection as both range boundaries', () => {
    const days = buildCalendarMonth('2026-08-01', '2026-08-14', '2026-08-03', '2026-08-03').flat();

    expect(days.find((day) => day.date === '2026-08-03')?.label).toContain('range start and end');
  });
});
