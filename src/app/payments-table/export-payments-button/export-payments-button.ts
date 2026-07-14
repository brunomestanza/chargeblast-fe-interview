import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-export-payments-button',
  template: `
    <button
      type="button"
      aria-controls="payments-table"
      aria-label="Export current payments view as CSV"
      [disabled]="disabled()"
      (click)="exportRequested.emit()"
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path d="M8 1.75v7.5m0 0 2.75-2.75M8 9.25 5.25 6.5" />
        <path d="M3 8.75v3.5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3.5" />
      </svg>
      <span>Export</span>
    </button>
  `,
  styleUrl: './export-payments-button.css',
})
export class ExportPaymentsButton {
  readonly disabled = input(false);
  readonly exportRequested = output<void>();
}
