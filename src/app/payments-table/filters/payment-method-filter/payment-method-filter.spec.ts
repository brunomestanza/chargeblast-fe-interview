import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { PaymentMethodFilter } from './payment-method-filter';
import type { PaymentMethodFilterValue } from './payment-method-filter-options.mock';

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

describe('PaymentMethodFilter', () => {
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

    await TestBed.configureTestingModule({ imports: [PaymentMethodFilter] }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function flushAnimationFrames(): void {
    const callbacks = [...animationFrames.values()];
    animationFrames.clear();
    callbacks.forEach((callback) => callback(0));
  }

  function createFilter(
    value: readonly PaymentMethodFilterValue[] = [],
  ): ComponentFixture<PaymentMethodFilter> {
    const fixture = TestBed.createComponent(PaymentMethodFilter);
    fixture.componentRef.setInput('value', value);
    fixture.detectChanges();
    return fixture;
  }

  function openFilter(fixture: ComponentFixture<PaymentMethodFilter>): HTMLElement {
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.filter-button__trigger')!.click();
    fixture.detectChanges();
    flushAnimationFrames();
    return element;
  }

  it('opens an accessible grouped dialog with every mocked option and focuses Visa', () => {
    const fixture = createFilter();
    const element = fixture.nativeElement as HTMLElement;
    const trigger = element.querySelector<HTMLButtonElement>('.filter-button__trigger')!;

    expect(trigger.getAttribute('aria-label')).toBe('Add Payment method filter');
    expect(element.querySelector('.filter-button__clear')).toBeNull();

    openFilter(fixture);

    const dialog = element.querySelector<HTMLElement>('[role="dialog"]')!;
    const heading = element.querySelector<HTMLHeadingElement>('h2')!;
    const fieldsets = element.querySelectorAll('fieldset');
    const checkboxes = element.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');

    expect(dialog.getAttribute('aria-labelledby')).toBe('payments-payment-method-filter-title');
    expect(heading.id).toBe('payments-payment-method-filter-title');
    expect(heading.textContent).toBe('Filter by: payment method');
    expect(
      Array.from(fieldsets, (fieldset) => fieldset.querySelector('legend')?.textContent),
    ).toEqual(['Card', 'Wallet', 'ACH and bank payments', 'Services']);
    expect(checkboxes).toHaveLength(20);
    expect(Array.from(checkboxes, (checkbox) => checkbox.value)).toEqual([
      'card:visa',
      'card:mastercard',
      'card:amex',
      'card:discover',
      'card:diners-club',
      'card:jcb',
      'card:unionpay',
      'card:elo',
      'wallet:apple-pay',
      'wallet:google-pay',
      'wallet:link',
      'method:ach',
      'method:sepa',
      'method:ideal',
      'method:pix',
      'method:boleto',
      'method:paypal',
      'method:cash-app-pay',
      'method:klarna',
      'method:afterpay',
    ]);
    expect(document.activeElement).toBe(checkboxes[0]);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe('payments-payment-method-filter');
  });

  it('applies values across groups in selection order and shows their labels', () => {
    const fixture = createFilter();
    const element = openFilter(fixture);
    const valueChange = vi.fn<(value: readonly PaymentMethodFilterValue[]) => void>();
    fixture.componentInstance.valueChange.subscribe(valueChange);

    findCheckbox(element, 'Visa').click();
    findCheckbox(element, 'Apple Pay').click();
    findCheckbox(element, 'ACH Direct Debit').click();
    findCheckbox(element, 'PayPal').click();
    fixture.detectChanges();
    findButton(element, 'Apply').click();
    fixture.detectChanges();
    flushAnimationFrames();

    expect(valueChange).toHaveBeenCalledWith([
      'card:visa',
      'wallet:apple-pay',
      'method:ach',
      'method:paypal',
    ]);
    expect(element.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(
      element.querySelector<HTMLButtonElement>('.filter-button__trigger'),
    );

    fixture.componentRef.setInput('value', [
      'card:visa',
      'wallet:apple-pay',
      'method:ach',
      'method:paypal',
    ] satisfies readonly PaymentMethodFilterValue[]);
    fixture.detectChanges();

    expect(element.querySelector('.filter-button__value')?.textContent?.trim()).toBe('Visa +3');
    expect(
      element
        .querySelector<HTMLButtonElement>('.filter-button__trigger')
        ?.getAttribute('aria-label'),
    ).toBe('Edit Payment method filter, currently Visa, Apple Pay, ACH Direct Debit, PayPal');
  });

  it('discards a draft on Escape and restores focus to the trigger', () => {
    const fixture = createFilter(['wallet:link']);
    const element = openFilter(fixture);
    const valueChange = vi.fn<(value: readonly PaymentMethodFilterValue[]) => void>();
    fixture.componentInstance.valueChange.subscribe(valueChange);

    findCheckbox(element, 'Visa').click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    flushAnimationFrames();

    expect(element.querySelector('[role="dialog"]')).toBeNull();
    expect(valueChange).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(
      element.querySelector<HTMLButtonElement>('.filter-button__trigger'),
    );

    openFilter(fixture);
    expect(findCheckbox(element, 'Link').checked).toBe(true);
    expect(findCheckbox(element, 'Visa').checked).toBe(false);
    expect(document.activeElement).toBe(findCheckbox(element, 'Link'));
  });

  it('emits an empty array and restores focus when cleared', () => {
    const fixture = createFilter(['method:pix']);
    const element = fixture.nativeElement as HTMLElement;
    const valueChange = vi.fn<(value: readonly PaymentMethodFilterValue[]) => void>();
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
    const fixture = createFilter(['method:ach']);
    const element = openFilter(fixture);
    const outside = document.createElement('button');
    document.body.append(outside);

    findCheckbox(element, 'PayPal').click();
    outside.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    fixture.detectChanges();

    expect(element.querySelector('[role="dialog"]')).toBeNull();

    openFilter(fixture);
    expect(findCheckbox(element, 'PayPal').checked).toBe(false);

    findCheckbox(element, 'Visa').click();
    outside.focus();
    fixture.detectChanges();

    expect(element.querySelector('[role="dialog"]')).toBeNull();

    openFilter(fixture);
    expect(findCheckbox(element, 'Visa').checked).toBe(false);

    outside.remove();
  });
});
