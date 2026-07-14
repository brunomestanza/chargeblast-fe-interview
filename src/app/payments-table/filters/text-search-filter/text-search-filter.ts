import { Component, ElementRef, computed, input, output, viewChild } from '@angular/core';

@Component({
  selector: 'app-text-search-filter',
  template: `
    <label class="visually-hidden" for="payments-text-search">Search payments</label>
    <div class="text-search-filter">
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
          <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <circle cx="10" cy="10" r="7.25" />
            <path d="m7.5 7.5 5 5m0-5-5 5" />
          </svg>
        </button>
      }
    </div>
    <span id="payments-text-search-help" class="visually-hidden">
      Results update two seconds after you stop typing.
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
