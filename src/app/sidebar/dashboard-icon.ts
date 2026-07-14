import { Component, input } from '@angular/core';

export type DashboardIconName =
  | 'arrow-left'
  | 'balances'
  | 'catalog'
  | 'check'
  | 'chevron-down'
  | 'chevron-right'
  | 'customers'
  | 'layers'
  | 'payments'
  | 'plus'
  | 'sandbox'
  | 'search'
  | 'settings'
  | 'sign-out';

@Component({
  selector: 'app-dashboard-icon',
  template: `
    @switch (name()) {
      @case ('payments') {
        <svg viewBox="0 0 20 20" focusable="false">
          <rect x="2.5" y="4" width="15" height="12" rx="2" />
          <path d="M2.5 8h15M5.5 12.5h3" />
        </svg>
      }
      @case ('customers') {
        <svg viewBox="0 0 20 20" focusable="false">
          <circle cx="10" cy="6.5" r="3" />
          <path d="M4.25 16c.45-3.05 2.4-4.55 5.75-4.55s5.3 1.5 5.75 4.55" />
        </svg>
      }
      @case ('balances') {
        <svg viewBox="0 0 20 20" focusable="false">
          <path d="m3 6.25 7-3 7 3-7 3-7-3Z" />
          <path d="m3 10 7 3 7-3M3 13.75l7 3 7-3" />
        </svg>
      }
      @case ('catalog') {
        <svg viewBox="0 0 20 20" focusable="false">
          <path d="m10 2.75 6.5 3.6v7.3L10 17.25l-6.5-3.6v-7.3L10 2.75Z" />
          <path d="m3.65 6.45 6.35 3.6 6.35-3.6M10 10.05v7" />
        </svg>
      }
      @case ('settings') {
        <svg viewBox="0 0 20 20" focusable="false">
          <circle cx="10" cy="10" r="2.5" />
          <path
            d="M8.7 2.8h2.6l.45 1.9c.45.16.87.4 1.25.7l1.85-.57 1.3 2.25-1.42 1.33c.04.26.07.53.07.8 0 .26-.03.52-.07.77l1.42 1.33-1.3 2.25L13 13c-.38.3-.8.54-1.25.7l-.45 1.9H8.7l-.45-1.9A5.1 5.1 0 0 1 7 13l-1.85.57-1.3-2.25 1.42-1.33a4.7 4.7 0 0 1 0-1.58L3.85 7.08l1.3-2.25L7 5.4c.38-.3.8-.54 1.25-.7l.45-1.9Z"
          />
        </svg>
      }
      @case ('sandbox') {
        <svg viewBox="0 0 20 20" focusable="false">
          <path
            d="M7 2.75h6M8 2.75v4.1l-4 7.35a2 2 0 0 0 1.75 3.05h8.5A2 2 0 0 0 16 14.2l-4-7.35v-4.1"
          />
          <path d="M6.2 12h7.6" />
        </svg>
      }
      @case ('plus') {
        <svg viewBox="0 0 20 20" focusable="false">
          <path d="M10 3.5v13M3.5 10h13" />
        </svg>
      }
      @case ('sign-out') {
        <svg viewBox="0 0 20 20" focusable="false">
          <path
            d="M8.25 3.25h-3a1.5 1.5 0 0 0-1.5 1.5v10.5a1.5 1.5 0 0 0 1.5 1.5h3M12.5 6.5 16 10l-3.5 3.5M7.25 10H16"
          />
        </svg>
      }
      @case ('search') {
        <svg viewBox="0 0 20 20" focusable="false">
          <circle cx="8.75" cy="8.75" r="4.75" />
          <path d="m12.25 12.25 3.75 3.75" />
        </svg>
      }
      @case ('chevron-down') {
        <svg viewBox="0 0 20 20" focusable="false">
          <path d="m5.5 7.5 4.5 4.5 4.5-4.5" />
        </svg>
      }
      @case ('chevron-right') {
        <svg viewBox="0 0 20 20" focusable="false">
          <path d="m7.5 5.5 4.5 4.5-4.5 4.5" />
        </svg>
      }
      @case ('check') {
        <svg viewBox="0 0 20 20" focusable="false">
          <path d="m4.5 10 3.25 3.25 7.75-7.5" />
        </svg>
      }
      @case ('layers') {
        <svg viewBox="0 0 20 20" focusable="false">
          <path d="m3 7 7-4 7 4-7 4-7-4Z" />
          <path d="m3 10.5 7 4 7-4M3 14l7 4 7-4" />
        </svg>
      }
      @case ('arrow-left') {
        <svg viewBox="0 0 20 20" focusable="false">
          <path d="M16.5 10h-13M8 4.5 2.5 10 8 15.5" />
        </svg>
      }
    }
  `,
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
