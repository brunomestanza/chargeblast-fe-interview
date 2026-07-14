import { Component, input } from '@angular/core';

@Component({
  selector: 'app-export-success-toast',
  host: {
    'aria-hidden': 'true',
  },
  template: `
    <div class="export-toast">
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <circle cx="8" cy="8" r="6.25" />
        <path d="m5.25 8 1.75 1.75 3.75-4" />
      </svg>
      <span>{{ message() }}</span>
    </div>
  `,
  styleUrl: './export-success-toast.css',
})
export class ExportSuccessToast {
  readonly message = input.required<string>();
}
