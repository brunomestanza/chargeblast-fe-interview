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
      <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
        <path
          d="M10.75 7.25a.75.75 0 0 1 .75.75v2.75a.75.75 0 0 1-.75.75h-9.5a.75.75 0 0 1-.75-.75V8A.75.75 0 0 1 2 8v2h8V8a.75.75 0 0 1 .75-.75Z"
        />
        <path
          d="M6.47.219a.752.752 0 0 1 1.061 0l3 3.007a.752.752 0 0 1 0 1.06l-3 2.995A.751.751 0 0 1 6.47 6.22l1.716-1.713H5.5a.75.75 0 0 0-.75.75V8a.75.75 0 0 1-1.5 0V5.256a2.25 2.25 0 0 1 2.25-2.25h2.691L6.47 1.28a.751.751 0 0 1 0-1.061Z"
        />
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
