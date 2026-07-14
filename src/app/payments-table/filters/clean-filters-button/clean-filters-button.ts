import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-clean-filters-button',
  template: `
    <button type="button" [disabled]="disabled()" (click)="cleanRequested.emit($event)">
      Clean all filters
    </button>
  `,
  styleUrl: './clean-filters-button.css',
})
export class CleanFiltersButton {
  readonly disabled = input(false);
  readonly cleanRequested = output<MouseEvent>();
}
