import { Component, ElementRef, computed, input, output, viewChild } from '@angular/core';

@Component({
  selector: 'app-filter-button',
  template: `
    <div
      class="filter-button"
      [class.filter-button--active]="hasValue()"
      [class.filter-button--expanded]="expanded()"
      role="group"
      [attr.aria-label]="label() + ' filter'"
    >
      <button
        #trigger
        type="button"
        class="filter-button__trigger"
        [attr.aria-label]="triggerLabel()"
        aria-haspopup="dialog"
        [attr.aria-expanded]="expanded()"
        [attr.aria-controls]="expanded() ? controls() : null"
        (click)="editRequested.emit($event)"
      >
        @if (!hasValue()) {
          <svg class="filter-button__add" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path
              d="M8.75 4.25a.75.75 0 0 0-1.5 0v3h-3a.75.75 0 0 0 0 1.5h3v3a.75.75 0 0 0 1.5 0v-3h3a.75.75 0 0 0 0-1.5h-3v-3Z"
            />
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M16 8a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-1.5 0A6.5 6.5 0 1 1 8 1.5 6.5 6.5 0 0 1 14.5 8Z"
            />
          </svg>
        }

        <span class="filter-button__label">{{ label() }}</span>

        @if (hasValue()) {
          <span class="filter-button__divider" aria-hidden="true"></span>
          <span class="filter-button__value">{{ value() }}</span>
          <svg
            class="filter-button__chevron"
            [class.filter-button__chevron--expanded]="expanded()"
            viewBox="0 0 8 8"
            aria-hidden="true"
            focusable="false"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M.606 2.334a.75.75 0 0 0-.022 1.06l2.875 3a.75.75 0 0 0 1.082 0L7.416 3.4a.75.75 0 0 0-1.082-1.038L4 4.79 1.667 2.357a.75.75 0 0 0-1.06-.022Z"
            />
          </svg>
        }
      </button>

      @if (hasValue()) {
        <button
          type="button"
          class="filter-button__clear"
          [attr.aria-label]="'Clear ' + label() + ' filter'"
          (click)="clearRequested.emit()"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path
              d="M5.53 4.47a.75.75 0 0 0-1.06 1.06L6.94 8l-2.47 2.47a.75.75 0 1 0 1.06 1.06L8 9.06l2.47 2.47a.75.75 0 1 0 1.06-1.06L9.06 8l2.47-2.47a.75.75 0 0 0-1.06-1.06L8 6.94 5.53 4.47Z"
            />
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M16 8a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-1.5 0A6.5 6.5 0 1 1 8 1.5 6.5 6.5 0 0 1 14.5 8Z"
            />
          </svg>
        </button>
      }
    </div>
  `,
  styleUrl: './filter-button.css',
})
export class FilterButton {
  readonly label = input.required<string>();
  readonly value = input<string | null>(null);
  readonly accessibleValue = input<string | null>(null);
  readonly expanded = input(false);
  readonly controls = input<string | null>(null);

  readonly editRequested = output<MouseEvent>();
  readonly clearRequested = output<void>();

  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  protected readonly hasValue = computed(() => {
    const value = this.value();
    return value !== null && value.length > 0;
  });

  protected readonly triggerLabel = computed(() => {
    const value = this.accessibleValue() ?? this.value();

    return value ? `Edit ${this.label()} filter, currently ${value}` : `Add ${this.label()} filter`;
  });

  focus(): void {
    this.trigger().nativeElement.focus();
  }
}
