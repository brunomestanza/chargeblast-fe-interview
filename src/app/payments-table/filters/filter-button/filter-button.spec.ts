import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { FilterButton } from './filter-button';

describe('FilterButton', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FilterButton] }).compileComponents();
  });

  it('renders an accessible add-filter trigger', () => {
    const fixture = TestBed.createComponent(FilterButton);
    fixture.componentRef.setInput('label', 'Date range');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const trigger = element.querySelector<HTMLButtonElement>('.filter-button__trigger');

    expect(trigger?.getAttribute('aria-label')).toBe('Add Date range filter');
    expect(trigger?.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    expect(trigger?.hasAttribute('aria-controls')).toBe(false);
    expect(element.querySelector('.filter-button__clear')).toBeNull();
    expect(element.textContent).toContain('Date range');
  });

  it('shows dynamic filter text with separate edit and clear actions', () => {
    const fixture = TestBed.createComponent(FilterButton);
    const editRequested = vi.fn();
    const clearRequested = vi.fn();

    fixture.componentRef.setInput('label', 'Amount');
    fixture.componentRef.setInput('value', 'Exactly R$ 1.00');
    fixture.componentRef.setInput('expanded', true);
    fixture.componentInstance.editRequested.subscribe(editRequested);
    fixture.componentInstance.clearRequested.subscribe(clearRequested);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const trigger = element.querySelector<HTMLButtonElement>('.filter-button__trigger')!;
    const clear = element.querySelector<HTMLButtonElement>('.filter-button__clear')!;

    expect(trigger.textContent).toContain('Exactly R$ 1.00');
    expect(trigger.getAttribute('aria-label')).toBe(
      'Edit Amount filter, currently Exactly R$ 1.00',
    );
    expect(clear.getAttribute('aria-label')).toBe('Clear Amount filter');

    trigger.click();
    clear.click();

    expect(editRequested).toHaveBeenCalledOnce();
    expect(clearRequested).toHaveBeenCalledOnce();
  });

  it('can expose a full accessible value and relate an open trigger to its popover', () => {
    const fixture = TestBed.createComponent(FilterButton);

    fixture.componentRef.setInput('label', 'Payment method');
    fixture.componentRef.setInput('value', 'Visa +3');
    fixture.componentRef.setInput('accessibleValue', 'Visa, Apple Pay, ACH Direct Debit, PayPal');
    fixture.componentRef.setInput('expanded', true);
    fixture.componentRef.setInput('controls', 'payments-payment-method-filter');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const trigger = element.querySelector<HTMLButtonElement>('.filter-button__trigger')!;

    expect(trigger.textContent).toContain('Visa +3');
    expect(trigger.getAttribute('aria-label')).toBe(
      'Edit Payment method filter, currently Visa, Apple Pay, ACH Direct Debit, PayPal',
    );
    expect(trigger.getAttribute('aria-controls')).toBe('payments-payment-method-filter');
  });
});
