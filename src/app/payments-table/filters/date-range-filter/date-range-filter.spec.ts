import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { DateRangeFilter } from './date-range-filter';
import { DateRangeSelection } from './date-range';

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

  it('opens an accessible one-month calendar with a single roving tab stop', () => {
    const fixture = createFilter();
    const element = fixture.nativeElement as HTMLElement;
    const trigger = element.querySelector<HTMLButtonElement>('.filter-button__trigger')!;

    trigger.click();
    fixture.detectChanges();

    const dialog = element.querySelector<HTMLElement>('[role="dialog"]');
    const calendar = element.querySelector<HTMLElement>('[role="grid"]');
    const dateButtons = element.querySelectorAll<HTMLButtonElement>('button[data-date]');
    const tabbableDateButtons = Array.from(dateButtons).filter((button) => button.tabIndex === 0);

    expect(dialog?.getAttribute('aria-labelledby')).toBe('payments-date-range-filter-title');
    expect(calendar?.getAttribute('aria-labelledby')).toBe('payments-date-range-filter-month');
    expect(calendar?.getAttribute('aria-multiselectable')).toBe('true');
    expect(dateButtons).toHaveLength(42);
    expect(tabbableDateButtons).toHaveLength(1);
    expect(tabbableDateButtons[0].dataset['date']).toBe('2026-07-14');
    expect(tabbableDateButtons[0].getAttribute('aria-current')).toBe('date');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('creates a preset as a draft and applies it explicitly', () => {
    const fixture = createFilter();
    const element = fixture.nativeElement as HTMLElement;
    const valueChange = vi.fn<(value: DateRangeSelection | null) => void>();
    fixture.componentInstance.valueChange.subscribe(valueChange);

    element.querySelector<HTMLButtonElement>('.filter-button__trigger')!.click();
    fixture.detectChanges();

    findButton(element, '7d').click();
    fixture.detectChanges();

    expect(findButton(element, '7d').getAttribute('aria-pressed')).toBe('true');
    expect(findButton(element, 'Apply').disabled).toBe(false);
    expect(element.querySelector('.date-filter__footer p')?.textContent?.trim()).toBe(
      'Jul 8, 2026 – Jul 14, 2026',
    );

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

    expect(element.querySelector('.date-filter__footer p')?.textContent?.trim()).toBe(
      'Jul 14, 2026',
    );

    findButton(element, 'Apply').click();

    expect(valueChange).toHaveBeenCalledWith({
      preset: 'today',
      start: '2026-07-14',
      end: '2026-07-14',
    });
  });

  it('normalizes a custom range selected in reverse order', () => {
    const fixture = createFilter();
    const element = fixture.nativeElement as HTMLElement;
    const valueChange = vi.fn<(value: DateRangeSelection | null) => void>();
    fixture.componentInstance.valueChange.subscribe(valueChange);

    element.querySelector<HTMLButtonElement>('.filter-button__trigger')!.click();
    fixture.detectChanges();
    findButton(element, 'Custom').click();
    fixture.detectChanges();

    element.querySelector<HTMLButtonElement>('button[data-date="2026-07-10"]')!.click();
    fixture.detectChanges();
    expect(findButton(element, 'Apply').disabled).toBe(true);

    element.querySelector<HTMLButtonElement>('button[data-date="2026-07-03"]')!.click();
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

  it('supports arrow-key calendar navigation and caps future dates at today', () => {
    const fixture = createFilter();
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.filter-button__trigger')!.click();
    fixture.detectChanges();

    const today = element.querySelector<HTMLButtonElement>('button[data-date="2026-07-14"]')!;
    today.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    fixture.detectChanges();

    expect(
      element.querySelector<HTMLButtonElement>('button[data-date="2026-07-13"]')?.tabIndex,
    ).toBe(0);

    element
      .querySelector<HTMLButtonElement>('button[data-date="2026-07-13"]')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    today.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();

    expect(today.tabIndex).toBe(0);
    expect(
      element.querySelector<HTMLButtonElement>('button[data-date="2026-07-15"]')?.disabled,
    ).toBe(true);
  });

  it('discards the draft on Escape and exposes a separate clear action', () => {
    const fixture = createFilter();
    const element = fixture.nativeElement as HTMLElement;
    const trigger = element.querySelector<HTMLButtonElement>('.filter-button__trigger')!;

    trigger.click();
    fixture.detectChanges();
    findButton(element, '30d').click();
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
