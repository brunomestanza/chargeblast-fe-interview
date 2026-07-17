import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { DateRangeFilter } from './date-range-filter';
import type { DateRangeSelection } from './date-range-selection';

const REFERENCE_TIME = Date.parse('2026-07-14T12:00:00Z');

function findButton(element: HTMLElement, label: string): HTMLButtonElement {
  const button = Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find(
    (candidate) => candidate.textContent?.trim() === label,
  );

  if (!button) {
    throw new Error(`Button ${label} was not found.`);
  }

  return button;
}

function setInputValue(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function setOperator(select: HTMLSelectElement, value: string): void {
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function createFilter() {
  const fixture = TestBed.createComponent(DateRangeFilter);
  fixture.componentRef.setInput('referenceTime', REFERENCE_TIME);
  fixture.componentRef.setInput('timeZone', 'UTC');
  fixture.detectChanges();
  return fixture;
}

describe('DateRangeFilter', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DateRangeFilter] }).compileComponents();
  });

  it('opens an accessible Stripe-style date range form without a calendar', () => {
    const fixture = createFilter();
    const element = fixture.nativeElement as HTMLElement;
    const trigger = element.querySelector<HTMLButtonElement>('.filter-button__trigger')!;

    trigger.click();
    fixture.detectChanges();

    const dialog = element.querySelector<HTMLElement>('[role="dialog"]');
    const operator = element.querySelector<HTMLSelectElement>(
      '#payments-date-range-filter-operator',
    );
    const relativeDays = element.querySelector<HTMLInputElement>('input[type="number"]');

    expect(dialog?.getAttribute('aria-labelledby')).toBe('payments-date-range-filter-title');
    expect(element.querySelector('#payments-date-range-filter-title')?.textContent).toBe(
      'Filtered by: date',
    );
    expect(trigger.getAttribute('aria-label')).toBe('Add Date and time filter');
    expect(Array.from(operator?.options ?? []).map((option) => option.text)).toEqual([
      'is in the last',
      'is equal to',
      'is between',
    ]);
    expect(relativeDays?.min).toBe('1');
    expect(element.querySelector('[role="grid"]')).toBeNull();
    expect(element.querySelector('input[type="date"]')).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('creates a canonical relative preset as a draft and applies it explicitly', () => {
    const fixture = createFilter();
    const element = fixture.nativeElement as HTMLElement;
    const valueChange = vi.fn<(value: DateRangeSelection | null) => void>();
    fixture.componentInstance.valueChange.subscribe(valueChange);

    element.querySelector<HTMLButtonElement>('.filter-button__trigger')!.click();
    fixture.detectChanges();

    setInputValue(element.querySelector<HTMLInputElement>('input[type="number"]')!, '7');
    fixture.detectChanges();

    expect(findButton(element, 'Apply').disabled).toBe(false);

    findButton(element, 'Apply').click();
    fixture.detectChanges();

    expect(valueChange).toHaveBeenCalledWith({
      preset: 'last-7-days',
      start: '2026-07-08',
      end: '2026-07-14',
    });
    expect(element.querySelector('[role="dialog"]')).toBeNull();
  });

  it('refreshes an applied relative preset when the filter is reopened on a later day', () => {
    const fixture = createFilter();
    const element = fixture.nativeElement as HTMLElement;
    const valueChange = vi.fn<(value: DateRangeSelection | null) => void>();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    fixture.componentRef.setInput('value', {
      preset: 'today',
      start: '2026-07-13',
      end: '2026-07-13',
    });
    fixture.detectChanges();

    element.querySelector<HTMLButtonElement>('.filter-button__trigger')!.click();
    fixture.detectChanges();

    expect(element.querySelector<HTMLInputElement>('input[type="number"]')?.value).toBe('1');

    findButton(element, 'Apply').click();

    expect(valueChange).toHaveBeenCalledWith({
      preset: 'today',
      start: '2026-07-14',
      end: '2026-07-14',
    });
  });

  it('normalizes a custom range entered in reverse order', () => {
    const fixture = createFilter();
    const element = fixture.nativeElement as HTMLElement;
    const valueChange = vi.fn<(value: DateRangeSelection | null) => void>();
    fixture.componentInstance.valueChange.subscribe(valueChange);

    element.querySelector<HTMLButtonElement>('.filter-button__trigger')!.click();
    fixture.detectChanges();

    setOperator(element.querySelector<HTMLSelectElement>('select')!, 'between');
    fixture.detectChanges();

    const dateInputs = element.querySelectorAll<HTMLInputElement>('input[type="text"]');
    const formatHint = element.querySelector<HTMLElement>(
      '#payments-date-range-filter-date-format-hint',
    )!;

    expect(formatHint.textContent?.trim()).toBe('Enter dates in YYYY-MM-DD format.');
    expect(
      Array.from(dateInputs, (input) => ({
        autocomplete: input.autocomplete,
        describedBy: input.getAttribute('aria-describedby'),
        inputMode: input.inputMode,
        placeholder: input.placeholder,
      })),
    ).toEqual([
      {
        autocomplete: 'off',
        describedBy: formatHint.id,
        inputMode: 'numeric',
        placeholder: 'YYYY-MM-DD',
      },
      {
        autocomplete: 'off',
        describedBy: formatHint.id,
        inputMode: 'numeric',
        placeholder: 'YYYY-MM-DD',
      },
    ]);
    setInputValue(dateInputs[0], '2026-07-10');
    setInputValue(dateInputs[1], '2026-07-03');
    fixture.detectChanges();

    expect(findButton(element, 'Apply').disabled).toBe(false);
    findButton(element, 'Apply').click();
    fixture.detectChanges();

    expect(valueChange).toHaveBeenCalledWith({
      preset: 'custom',
      start: '2026-07-03',
      end: '2026-07-10',
    });
  });

  it('discards the draft on Escape and exposes a separate clear action', () => {
    const fixture = createFilter();
    const element = fixture.nativeElement as HTMLElement;
    const trigger = element.querySelector<HTMLButtonElement>('.filter-button__trigger')!;

    trigger.click();
    fixture.detectChanges();
    setInputValue(element.querySelector<HTMLInputElement>('input[type="number"]')!, '30');
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(element.querySelector('[role="dialog"]')).toBeNull();

    const valueChange = vi.fn<(value: DateRangeSelection | null) => void>();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    fixture.componentRef.setInput('value', {
      preset: 'today',
      start: '2026-07-14',
      end: '2026-07-14',
    });
    fixture.detectChanges();

    element.querySelector<HTMLButtonElement>('.filter-button__clear')!.click();
    expect(valueChange).toHaveBeenCalledWith(null);
  });

  it('moves focus to the trigger when clearing a closed filter', () => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });

    const fixture = createFilter();
    const element = fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('value', {
      preset: 'today',
      start: '2026-07-14',
      end: '2026-07-14',
    });
    fixture.detectChanges();

    // The filter is controlled, so mirror the parent writing the cleared value back.
    fixture.componentInstance.valueChange.subscribe(() => {
      fixture.componentRef.setInput('value', null);
    });

    const clear = element.querySelector<HTMLButtonElement>('.filter-button__clear')!;
    clear.focus();
    expect(document.activeElement).toBe(clear);

    clear.click();
    fixture.detectChanges();
    frames.forEach((frame) => frame(0));

    // The clear button unmounts with the value, so focus must not land on body.
    expect(element.querySelector('.filter-button__clear')).toBeNull();
    expect(document.activeElement).toBe(
      element.querySelector<HTMLButtonElement>('.filter-button__trigger'),
    );

    vi.restoreAllMocks();
  });
});
