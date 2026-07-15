import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-clean-filters-button',
  host: {
    '[class.clean-filters-button--hidden]': 'disabled()',
  },
  template: `
    <button type="button" [disabled]="disabled()" (click)="cleanRequested.emit($event)">
      Clear filters
    </button>
  `,
  styleUrl: './clean-filters-button.css',
})
export class CleanFiltersButton {
  readonly disabled = input(false);
  readonly cleanRequested = output<MouseEvent>();
}
