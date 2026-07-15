import { Component, input } from '@angular/core';
import type { DashboardIconName } from './dashboard-icon.types';

export type { DashboardIconName } from './dashboard-icon.types';

@Component({
  selector: 'app-dashboard-icon',
  templateUrl: './dashboard-icon.html',
  styles: `
    :host {
      display: inline-flex;
      width: 20px;
      height: 20px;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
    }

    svg {
      width: 100%;
      height: 100%;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.55;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  `,
  host: {
    'aria-hidden': 'true',
  },
})
export class DashboardIcon {
  readonly name = input.required<DashboardIconName>();
}
