import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { PaymentStatus } from '../../payment';
import { StatusFilter } from './status-filter';

function findCheckbox(element: HTMLElement, label: string): HTMLInputElement {
  const checkbox = Array.from(
    element.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
  ).find((candidate) => candidate.closest('label')?.textContent?.trim() === label);

  if (!checkbox) {
    throw new Error(`Checkbox ${label} was not found.`);
  }

  return checkbox;
}

function findButton(element: HTMLElement, label: string): HTMLButtonElement {
  const button = Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find(
    (candidate) => candidate.textContent?.trim() === label,
  );

  if (!button) {
    throw new Error(`Button ${label} was not found.`);
  }

  return button;
}

function clickOptionText(element: HTMLElement, label: string): void {
  const text = findCheckbox(element, label)
    .closest('label')
    ?.querySelector<HTMLElement>('.status-filter__label');

  if (!text) {
    throw new Error(`Option text ${label} was not found.`);
  }

  text.click();
}

describe('StatusFilter', () => {
  let animationFrames: Map<number, FrameRequestCallback>;
  let nextAnimationFrame: number;

  beforeEach(async () => {
    animationFrames = new Map();
    nextAnimationFrame = 1;

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      const frame = nextAnimationFrame++;
      animationFrames.set(frame, callback);
      return frame;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((frame) => {
      animationFrames.delete(frame);
    });

    await TestBed.configureTestingModule({ imports: [StatusFilter] }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function flushAnimationFrames(): void {
    const callbacks = [...animationFrames.values()];
    animationFrames.clear();
    callbacks.forEach((callback) => callback(0));
  }

  function createFilter(value: readonly PaymentStatus[] = []): ComponentFixture<StatusFilter> {
    const fixture = TestBed.createComponent(StatusFilter);
    fixture.componentRef.setInput('value', value);
    fixture.detectChanges();
    return fixture;
  }

  function openFilter(fixture: ComponentFixture<StatusFilter>): HTMLElement {
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.filter-button__trigger')!.click();
    fixture.detectChanges();
    flushAnimationFrames();
    return element;
  }

  it('opens an accessible four-option dialog and focuses the first checkbox', () => {
    const fixture = createFilter();
    const element = fixture.nativeElement as HTMLElement;
    const trigger = element.querySelector<HTMLButtonElement>('.filter-button__trigger')!;

    expect(trigger.getAttribute('aria-label')).toBe('Add Status filter');
    expect(element.querySelector('.filter-button__clear')).toBeNull();

    openFilter(fixture);

    const dialog = element.querySelector<HTMLElement>('[role="dialog"]')!;
    const heading = element.querySelector<HTMLHeadingElement>('h2')!;
    const checkboxes = element.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');

    expect(dialog.getAttribute('aria-labelledby')).toBe('payments-status-filter-title');
    expect(heading.id).toBe('payments-status-filter-title');
    expect(heading.textContent).toBe('Filtered by: status');
    expect(element.querySelector('fieldset')).not.toBeNull();
    expect(element.querySelector('legend')?.textContent).toContain('Select payment statuses');
    expect(Array.from(checkboxes, (checkbox) => checkbox.value)).toEqual([
      'succeeded',
      'failed',
      'refunded',
      'disputed',
      'uncaptured',
      'canceled',
      'blocked',
    ]);
    expect(
      Array.from(checkboxes, (checkbox) => checkbox.closest('label')?.textContent?.trim()),
    ).toEqual(['Succeeded', 'Failed', 'Refunded', 'Disputed', 'Uncaptured', 'Canceled', 'Blocked']);
    expect(document.activeElement).toBe(checkboxes[0]);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('applies statuses in selection order and shows their joined labels', () => {
    const fixture = createFilter();
    const element = openFilter(fixture);
    const valueChange = vi.fn<(value: readonly PaymentStatus[]) => void>();
    fixture.componentInstance.valueChange.subscribe(valueChange);

    clickOptionText(element, 'Succeeded');
    fixture.detectChanges();
    findCheckbox(element, 'Failed').click();
    fixture.detectChanges();
    findButton(element, 'Apply').click();
    fixture.detectChanges();
    flushAnimationFrames();

    expect(valueChange).toHaveBeenCalledWith(['succeeded', 'failed']);
    expect(element.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(
      element.querySelector<HTMLButtonElement>('.filter-button__trigger'),
    );

    fixture.componentRef.setInput('value', ['succeeded', 'failed']);
    fixture.detectChanges();

    expect(element.querySelector('.filter-button__value')?.textContent?.trim()).toBe(
      'Succeeded, Failed',
    );
  });

  it('moves a removed and reselected status to the end', () => {
    const fixture = createFilter(['succeeded', 'failed']);
    const element = openFilter(fixture);
    const valueChange = vi.fn<(value: readonly PaymentStatus[]) => void>();
    fixture.componentInstance.valueChange.subscribe(valueChange);

    findCheckbox(element, 'Succeeded').click();
    fixture.detectChanges();
    findCheckbox(element, 'Succeeded').click();
    fixture.detectChanges();
    findButton(element, 'Apply').click();

    expect(valueChange).toHaveBeenCalledWith(['failed', 'succeeded']);
  });

  it('applies an empty selection as a cleared filter', () => {
    const fixture = createFilter();
    const element = openFilter(fixture);
    const valueChange = vi.fn<(value: readonly PaymentStatus[]) => void>();
    fixture.componentInstance.valueChange.subscribe(valueChange);

    findButton(element, 'Apply').click();
    fixture.detectChanges();

    expect(valueChange).toHaveBeenCalledWith([]);
    expect(element.querySelector('[role="dialog"]')).toBeNull();
  });

  it('discards a draft on Escape and restores focus to the trigger', () => {
    const fixture = createFilter(['disputed']);
    const element = openFilter(fixture);
    const valueChange = vi.fn<(value: readonly PaymentStatus[]) => void>();
    fixture.componentInstance.valueChange.subscribe(valueChange);

    findCheckbox(element, 'Failed').click();
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    flushAnimationFrames();

    expect(element.querySelector('[role="dialog"]')).toBeNull();
    expect(valueChange).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(
      element.querySelector<HTMLButtonElement>('.filter-button__trigger'),
    );

    openFilter(fixture);

    expect(findCheckbox(element, 'Disputed').checked).toBe(true);
    expect(findCheckbox(element, 'Failed').checked).toBe(false);
  });

  it('emits an empty array and restores focus when cleared', () => {
    const fixture = createFilter(['refunded']);
    const element = fixture.nativeElement as HTMLElement;
    const valueChange = vi.fn<(value: readonly PaymentStatus[]) => void>();
    fixture.componentInstance.valueChange.subscribe(valueChange);

    element.querySelector<HTMLButtonElement>('.filter-button__clear')!.click();
    fixture.detectChanges();
    flushAnimationFrames();

    expect(valueChange).toHaveBeenCalledWith([]);
    expect(document.activeElement).toBe(
      element.querySelector<HTMLButtonElement>('.filter-button__trigger'),
    );
  });

  it('discards drafts when pointer or focus moves outside', () => {
    const fixture = createFilter(['disputed']);
    const element = openFilter(fixture);
    const outside = document.createElement('button');
    document.body.append(outside);

    findCheckbox(element, 'Failed').click();
    fixture.detectChanges();
    outside.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    fixture.detectChanges();

    expect(element.querySelector('[role="dialog"]')).toBeNull();

    openFilter(fixture);
    expect(findCheckbox(element, 'Failed').checked).toBe(false);

    findCheckbox(element, 'Succeeded').click();
    fixture.detectChanges();
    outside.focus();
    fixture.detectChanges();

    expect(element.querySelector('[role="dialog"]')).toBeNull();

    openFilter(fixture);
    expect(findCheckbox(element, 'Succeeded').checked).toBe(false);

    outside.remove();
  });
});
