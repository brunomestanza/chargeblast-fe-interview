import { Component, ElementRef, computed, input, output, viewChild } from '@angular/core';

@Component({
  selector: 'app-filter-button',
  template: `
    <div
      class="filter-button"
      [class.filter-button--active]="hasValue()"
      role="group"
      [attr.aria-label]="label() + ' filter'"
    >
      @if (hasValue()) {
        <button
          type="button"
          class="filter-button__clear"
          [attr.aria-label]="'Clear ' + label() + ' filter'"
          (click)="clearRequested.emit()"
        >
          <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <circle cx="10" cy="10" r="7.25" />
            <path d="m7.5 7.5 5 5m0-5-5 5" />
          </svg>
        </button>
      }

      <button
        #trigger
        type="button"
        class="filter-button__trigger"
        [attr.aria-label]="triggerLabel()"
        aria-haspopup="dialog"
        [attr.aria-expanded]="expanded()"
        (click)="editRequested.emit()"
      >
        @if (!hasValue()) {
          <svg class="filter-button__add" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <circle cx="10" cy="10" r="7.25" />
            <path d="M10 6.5v7M6.5 10h7" />
          </svg>
        }

        <span class="filter-button__label">{{ label() }}</span>

        @if (hasValue()) {
          <span class="filter-button__divider" aria-hidden="true"></span>
          <span class="filter-button__value">{{ value() }}</span>
          <svg
            class="filter-button__chevron"
            [class.filter-button__chevron--expanded]="expanded()"
            viewBox="0 0 16 16"
            aria-hidden="true"
            focusable="false"
          >
            <path d="m4.5 6.25 3.5 3.5 3.5-3.5" />
          </svg>
        }
      </button>
    </div>
  `,
  styleUrl: './filter-button.css',
})
export class FilterButton {
  readonly label = input.required<string>();
  readonly value = input<string | null>(null);
  readonly expanded = input(false);

  readonly editRequested = output<void>();
  readonly clearRequested = output<void>();

  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  protected readonly hasValue = computed(() => {
    const value = this.value();
    return value !== null && value.length > 0;
  });

  protected readonly triggerLabel = computed(() => {
    const value = this.value();

    return value ? `Edit ${this.label()} filter, currently ${value}` : `Add ${this.label()} filter`;
  });

  focus(): void {
    this.trigger().nativeElement.focus();
  }
}
