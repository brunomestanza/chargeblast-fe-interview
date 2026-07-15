import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import type { AmountRange } from './amount-range';
import { AmountRangeFilter } from './amount-range-filter';

function setNumberInput(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('AmountRangeFilter', () => {
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

    await TestBed.configureTestingModule({ imports: [AmountRangeFilter] }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function flushAnimationFrames(): void {
    const callbacks = [...animationFrames.values()];
    animationFrames.clear();
    callbacks.forEach((callback) => callback(0));
  }

  function createFilter(value: AmountRange | null = null): ComponentFixture<AmountRangeFilter> {
    const fixture = TestBed.createComponent(AmountRangeFilter);
    fixture.componentRef.setInput('value', value);
    fixture.detectChanges();
    return fixture;
  }

  function openFilter(fixture: ComponentFixture<AmountRangeFilter>): HTMLElement {
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.filter-button__trigger')!.click();
    fixture.detectChanges();
    flushAnimationFrames();
    return element;
  }

  function inputs(element: HTMLElement): readonly [HTMLInputElement, HTMLInputElement] {
    const fields = element.querySelectorAll<HTMLInputElement>('input[type="number"]');
    return [fields[0], fields[1]];
  }

  it('opens an accessible USD range dialog with the expected defaults and focuses minimum', () => {
    const fixture = createFilter();
    const element = fixture.nativeElement as HTMLElement;
    const trigger = element.querySelector<HTMLButtonElement>('.filter-button__trigger')!;

    expect(trigger.getAttribute('aria-label')).toBe('Add Amount filter');
    expect(trigger.getAttribute('aria-controls')).toBeNull();
    expect(element.querySelector('.filter-button__clear')).toBeNull();

    openFilter(fixture);

    const dialog = element.querySelector<HTMLElement>('[role="dialog"]')!;
    const heading = element.querySelector<HTMLHeadingElement>('h2')!;
    const [minimum, maximum] = inputs(element);
    const apply = element.querySelector<HTMLButtonElement>('.amount-range-filter__apply')!;
    const hint = element.querySelector<HTMLElement>('.amount-range-filter__hint')!;
    const operator = element.querySelector<HTMLSelectElement>('.amount-range-filter__operator')!;

    expect(dialog.getAttribute('aria-labelledby')).toBe('payments-amount-range-filter-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('payments-amount-range-filter-hint');
    expect(heading.textContent).toBe('Filtered by: amount');
    expect(minimum.labels?.[0]?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Minimum amount in USD',
    );
    expect(maximum.labels?.[0]?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Maximum amount in USD',
    );
    expect(minimum.value).toBe('');
    expect(maximum.value).toBe('');
    expect(minimum.required).toBe(false);
    expect(maximum.required).toBe(true);
    expect(minimum.min).toBe('0');
    expect(maximum.min).toBe('1');
    expect(minimum.step).toBe('0.01');
    expect(maximum.step).toBe('0.01');
    expect(hint.textContent?.trim()).toBe(
      'Enter a maximum amount and optionally a minimum to find payments within this USD range.',
    );
    expect(operator.labels?.[0]?.textContent?.trim()).toBe('Amount comparison operator');
    expect(operator.options).toHaveLength(1);
    expect(operator.value).toBe('between');
    expect(operator.selectedOptions[0]?.textContent).toBe('is between');
    expect(minimum.getAttribute('aria-describedby')).toContain(hint.id);
    expect(maximum.getAttribute('aria-describedby')).toContain(hint.id);
    expect(apply.disabled).toBe(true);
    expect(document.activeElement).toBe(minimum);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe('payments-amount-range-filter');
  });

  it('suppresses the entrance animation when the trigger is activated by keyboard', () => {
    const fixture = createFilter();
    const element = fixture.nativeElement as HTMLElement;
    const trigger = element.querySelector<HTMLButtonElement>('.filter-button__trigger')!;

    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }));
    fixture.detectChanges();

    expect(
      element
        .querySelector('[role="dialog"]')
        ?.classList.contains('amount-range-filter__popover--without-motion'),
    ).toBe(true);
  });

  it('shows colocated errors and keeps Apply disabled for every invalid range rule', () => {
    const fixture = createFilter();
    const element = openFilter(fixture);
    const [minimum, maximum] = inputs(element);
    const apply = element.querySelector<HTMLButtonElement>('.amount-range-filter__apply')!;

    maximum.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(element.querySelector('#payments-amount-range-filter-maximum-error')?.textContent).toBe(
      'Enter a maximum amount.',
    );
    expect(maximum.getAttribute('aria-invalid')).toBe('true');

    setNumberInput(maximum, '0.99');
    fixture.detectChanges();
    expect(element.querySelector('#payments-amount-range-filter-maximum-error')?.textContent).toBe(
      'Maximum must be at least $1.00.',
    );
    expect(apply.disabled).toBe(true);

    setNumberInput(maximum, '10');
    setNumberInput(minimum, '11');
    fixture.detectChanges();
    expect(element.querySelector('#payments-amount-range-filter-maximum-error')?.textContent).toBe(
      'Maximum cannot be below the minimum.',
    );
    expect(apply.disabled).toBe(true);

    setNumberInput(minimum, '-1');
    fixture.detectChanges();
    expect(element.querySelector('#payments-amount-range-filter-minimum-error')?.textContent).toBe(
      'Minimum cannot be below $0.00.',
    );
    expect(minimum.getAttribute('aria-invalid')).toBe('true');
    expect(apply.disabled).toBe(true);

    setNumberInput(minimum, '1.001');
    setNumberInput(maximum, '2');
    fixture.detectChanges();
    expect(element.querySelector('#payments-amount-range-filter-minimum-error')?.textContent).toBe(
      'Use no more than two decimal places.',
    );
    expect(apply.disabled).toBe(true);
  });

  it('reveals an order error when editing only the minimum invalidates the applied maximum', () => {
    const fixture = createFilter({ minimumUsdCents: 1_000, maximumUsdCents: 10_000 });
    const element = openFilter(fixture);
    const [minimum, maximum] = inputs(element);

    setNumberInput(minimum, '101');
    fixture.detectChanges();

    expect(maximum.getAttribute('aria-invalid')).toBe('true');
    expect(element.querySelector('#payments-amount-range-filter-maximum-error')?.textContent).toBe(
      'Maximum cannot be below the minimum.',
    );
    expect(element.querySelector<HTMLButtonElement>('.amount-range-filter__apply')?.disabled).toBe(
      true,
    );
  });

  it('applies with Enter, emits integer cents, and restores focus to the trigger', () => {
    const fixture = createFilter();
    const element = openFilter(fixture);
    const [minimum, maximum] = inputs(element);
    const valueChange = vi.fn<(value: AmountRange | null) => void>();
    fixture.componentInstance.valueChange.subscribe(valueChange);

    setNumberInput(minimum, '10');
    setNumberInput(maximum, '100');
    fixture.detectChanges();

    const apply = element.querySelector<HTMLButtonElement>('.amount-range-filter__apply')!;
    expect(apply.disabled).toBe(false);

    element
      .querySelector<HTMLFormElement>('form')!
      .dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    flushAnimationFrames();

    expect(valueChange).toHaveBeenCalledWith({
      minimumUsdCents: 1_000,
      maximumUsdCents: 10_000,
    });
    expect(element.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(
      element.querySelector<HTMLButtonElement>('.filter-button__trigger'),
    );
  });

  it('treats an empty minimum as zero when applying only a maximum', () => {
    const fixture = createFilter();
    const element = openFilter(fixture);
    const [minimum, maximum] = inputs(element);
    const valueChange = vi.fn<(value: AmountRange | null) => void>();
    fixture.componentInstance.valueChange.subscribe(valueChange);

    expect(minimum.value).toBe('');
    setNumberInput(maximum, '100');
    fixture.detectChanges();

    const apply = element.querySelector<HTMLButtonElement>('.amount-range-filter__apply')!;
    expect(apply.disabled).toBe(false);
    apply.click();
    fixture.detectChanges();

    expect(valueChange).toHaveBeenCalledWith({
      minimumUsdCents: 0,
      maximumUsdCents: 10_000,
    });
  });

  it('accepts equal bounds and renders the exact active label', () => {
    const fixture = createFilter();
    const element = openFilter(fixture);
    const [minimum, maximum] = inputs(element);
    const valueChange = vi.fn<(value: AmountRange | null) => void>();
    fixture.componentInstance.valueChange.subscribe(valueChange);

    setNumberInput(minimum, '10');
    setNumberInput(maximum, '10');
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.amount-range-filter__apply')!.click();
    fixture.detectChanges();

    expect(valueChange).toHaveBeenCalledWith({
      minimumUsdCents: 1_000,
      maximumUsdCents: 1_000,
    });

    fixture.componentRef.setInput('value', {
      minimumUsdCents: 1_000,
      maximumUsdCents: 10_000,
    } satisfies AmountRange);
    fixture.detectChanges();

    expect(element.querySelector('.filter-button__value')?.textContent?.trim()).toBe(
      '$10.00 to $100.00',
    );
    expect(
      element
        .querySelector<HTMLButtonElement>('.filter-button__trigger')
        ?.getAttribute('aria-label'),
    ).toBe('Edit Amount filter, currently $10.00 to $100.00');
  });

  it('restores the applied range when reopened and discards changes on Escape', () => {
    const fixture = createFilter({ minimumUsdCents: 1_000, maximumUsdCents: 10_000 });
    const element = openFilter(fixture);
    let [minimum, maximum] = inputs(element);
    const valueChange = vi.fn<(value: AmountRange | null) => void>();
    fixture.componentInstance.valueChange.subscribe(valueChange);

    expect(minimum.value).toBe('10');
    expect(maximum.value).toBe('100');

    setNumberInput(minimum, '25');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    flushAnimationFrames();

    expect(valueChange).not.toHaveBeenCalled();
    expect(element.querySelector('[role="dialog"]')).toBeNull();

    openFilter(fixture);
    [minimum, maximum] = inputs(element);
    expect(minimum.value).toBe('10');
    expect(maximum.value).toBe('100');
  });

  it('emits null and restores focus when cleared', () => {
    const fixture = createFilter({ minimumUsdCents: 1_000, maximumUsdCents: 10_000 });
    const element = fixture.nativeElement as HTMLElement;
    const valueChange = vi.fn<(value: AmountRange | null) => void>();
    fixture.componentInstance.valueChange.subscribe(valueChange);

    element.querySelector<HTMLButtonElement>('.filter-button__clear')!.click();
    fixture.detectChanges();
    flushAnimationFrames();

    expect(valueChange).toHaveBeenCalledWith(null);
    expect(document.activeElement).toBe(
      element.querySelector<HTMLButtonElement>('.filter-button__trigger'),
    );
  });

  it('discards drafts when pointer or focus moves outside', () => {
    const fixture = createFilter({ minimumUsdCents: 1_000, maximumUsdCents: 10_000 });
    const element = openFilter(fixture);
    const outside = document.createElement('button');
    document.body.append(outside);

    const [minimum] = inputs(element);
    setNumberInput(minimum, '25');
    outside.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    fixture.detectChanges();
    expect(element.querySelector('[role="dialog"]')).toBeNull();

    openFilter(fixture);
    expect(inputs(element)[0].value).toBe('10');

    setNumberInput(inputs(element)[0], '30');
    outside.focus();
    fixture.detectChanges();
    expect(element.querySelector('[role="dialog"]')).toBeNull();

    openFilter(fixture);
    expect(inputs(element)[0].value).toBe('10');

    outside.remove();
  });
});
