import { Component, ElementRef, computed, input, output, viewChild } from '@angular/core';

@Component({
  selector: 'app-text-search-filter',
  template: `
    <label class="visually-hidden" for="payments-text-search">Search payments</label>
    <div class="text-search-filter">
      <svg
        class="text-search-filter__search-icon"
        viewBox="0 0 16 16"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="6.75" cy="6.75" r="4.25" />
        <path d="m10 10 3.5 3.5" />
      </svg>

      <input
        #searchInput
        id="payments-text-search"
        class="text-search-filter__input"
        [class.text-search-filter__input--active]="hasValue()"
        type="search"
        [value]="value()"
        aria-controls="payments-table"
        aria-describedby="payments-text-search-help"
        placeholder="ID, email, or last 4"
        autocomplete="off"
        autocapitalize="none"
        spellcheck="false"
        (input)="changeValue($event)"
      />

      @if (hasValue()) {
        <button
          type="button"
          class="text-search-filter__clear"
          aria-label="Clear text search filter"
          (click)="clearValue()"
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
    <span id="payments-text-search-help" class="visually-hidden">
      Search starts shortly after you stop typing.
    </span>
  `,
  styleUrl: './text-search-filter.css',
})
export class TextSearchFilter {
  readonly value = input('');
  readonly valueChange = output<string>();

  private readonly searchInput = viewChild.required<ElementRef<HTMLInputElement>>('searchInput');
  protected readonly hasValue = computed(() => this.value().length > 0);

  protected changeValue(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }

  protected clearValue(): void {
    this.valueChange.emit('');
    this.searchInput().nativeElement.focus();
  }

  focus(): void {
    this.searchInput().nativeElement.focus();
  }
}
