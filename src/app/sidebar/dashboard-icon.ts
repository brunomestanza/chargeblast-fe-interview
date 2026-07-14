import { Component, input } from '@angular/core';

export type DashboardIconName =
  | 'apps'
  | 'arrow-left'
  | 'assistant'
  | 'balances'
  | 'business'
  | 'catalog'
  | 'check'
  | 'chevron-down'
  | 'chevron-right'
  | 'communication'
  | 'connect'
  | 'customers'
  | 'data-pipeline'
  | 'documents'
  | 'help'
  | 'identity'
  | 'layers'
  | 'notifications'
  | 'payments'
  | 'plus'
  | 'profile'
  | 'radar'
  | 'receipt'
  | 'sandbox'
  | 'search'
  | 'security'
  | 'settings'
  | 'sigma'
  | 'sign-out'
  | 'sparkles'
  | 'tax'
  | 'terminal';

@Component({
  selector: 'app-dashboard-icon',
  template: `
    @switch (name()) {
      @case ('apps') {
        <svg viewBox="0 0 20 20" focusable="false">
          <rect x="2.75" y="2.75" width="5.5" height="5.5" rx="1.25" />
          <rect x="11.75" y="2.75" width="5.5" height="5.5" rx="1.25" />
          <rect x="2.75" y="11.75" width="5.5" height="5.5" rx="1.25" />
          <path d="M14.5 11.75v5.5M11.75 14.5h5.5" />
        </svg>
      }
      @case ('assistant') {
        <svg viewBox="0 0 20 20" focusable="false">
          <path
            d="M10 2.5c.35 4.55 2.95 7.15 7.5 7.5-4.55.35-7.15 2.95-7.5 7.5-.35-4.55-2.95-7.15-7.5-7.5 4.55-.35 7.15-2.95 7.5-7.5Z"
          />
        </svg>
      }
      @case ('business') {
        <svg viewBox="0 0 20 20" focusable="false">
          <path d="M3.25 17V5.25h8.5V17M11.75 8.25h5V17M2.5 17h15" />
          <path d="M6 8h3M6 11h3M6 14h3M14 11h1.5M14 14h1.5" />
        </svg>
      }
      @case ('communication') {
        <svg viewBox="0 0 20 20" focusable="false">
          <rect x="2.75" y="4.25" width="14.5" height="11.5" rx="2" />
          <path d="m3.5 5.25 6.5 5 6.5-5" />
        </svg>
      }
      @case ('connect') {
        <svg viewBox="0 0 20 20" focusable="false">
          <circle cx="5" cy="5" r="2" />
          <circle cx="15" cy="5" r="2" />
          <circle cx="10" cy="15" r="2" />
          <path d="m6.7 6.1 2.25 6.95M13.3 6.1l-2.25 6.95M7 5h6" />
        </svg>
      }
      @case ('data-pipeline') {
        <svg viewBox="0 0 20 20" focusable="false">
          <ellipse cx="10" cy="4.75" rx="6.5" ry="2.25" />
          <path
            d="M3.5 4.75v5c0 1.25 2.9 2.25 6.5 2.25s6.5-1 6.5-2.25v-5M3.5 9.75v5c0 1.25 2.9 2.25 6.5 2.25s6.5-1 6.5-2.25v-5"
          />
        </svg>
      }
      @case ('documents') {
        <svg viewBox="0 0 20 20" focusable="false">
          <path d="M5 2.75h6l4 4v10.5H5V2.75Z" />
          <path d="M11 2.75v4h4M7.75 10h4.5M7.75 13h4.5" />
        </svg>
      }
      @case ('help') {
        <svg viewBox="0 0 20 20" focusable="false">
          <circle cx="10" cy="10" r="7.25" />
          <path
            d="M7.75 7.5a2.4 2.4 0 0 1 4.65.85c0 1.65-1.45 1.95-2.15 2.9-.2.3-.25.55-.25.85M10 15h.01"
          />
        </svg>
      }
      @case ('identity') {
        <svg viewBox="0 0 20 20" focusable="false">
          <path d="M10 2.5 16 5v4.4c0 3.85-2.05 6.6-6 8.1-3.95-1.5-6-4.25-6-8.1V5l6-2.5Z" />
          <circle cx="10" cy="8" r="1.75" />
          <path d="M7.25 13c.35-1.65 1.25-2.4 2.75-2.4s2.4.75 2.75 2.4" />
        </svg>
      }
      @case ('notifications') {
        <svg viewBox="0 0 20 20" focusable="false">
          <path d="M4.25 13.75h11.5l-1.25-1.9V8a4.5 4.5 0 0 0-9 0v3.85l-1.25 1.9Z" />
          <path d="M8.25 16a2 2 0 0 0 3.5 0" />
        </svg>
      }
      @case ('profile') {
        <svg viewBox="0 0 20 20" focusable="false">
          <circle cx="10" cy="10" r="7.25" />
          <circle cx="10" cy="7.5" r="2.25" />
          <path d="M5.75 15c.65-2.35 2.05-3.45 4.25-3.45s3.6 1.1 4.25 3.45" />
        </svg>
      }
      @case ('radar') {
        <svg viewBox="0 0 20 20" focusable="false">
          <circle cx="10" cy="10" r="7.25" />
          <circle cx="10" cy="10" r="3.5" />
          <path d="M10 10 15.25 5M10 2.75V5M17.25 10H15" />
        </svg>
      }
      @case ('receipt') {
        <svg viewBox="0 0 20 20" focusable="false">
          <path d="M4.25 2.75h11.5v14.5l-2-1.25-1.85 1.25L10 16l-1.9 1.25L6.25 16l-2 1.25V2.75Z" />
          <path d="M7 6.25h6M7 9.5h6M7 12.75h3.5" />
        </svg>
      }
      @case ('security') {
        <svg viewBox="0 0 20 20" focusable="false">
          <rect x="4" y="8.25" width="12" height="9" rx="2" />
          <path d="M6.75 8.25V6a3.25 3.25 0 0 1 6.5 0v2.25M10 12v1.75" />
        </svg>
      }
      @case ('sigma') {
        <svg viewBox="0 0 20 20" focusable="false">
          <path d="M15.75 3.25H4.5l5.25 6.75-5.25 6.75h11.25" />
        </svg>
      }
      @case ('sparkles') {
        <svg viewBox="0 0 20 20" focusable="false">
          <path
            d="M8 2.75c.25 3.2 2.05 5 5.25 5.25C10.05 8.25 8.25 10.05 8 13.25 7.75 10.05 5.95 8.25 2.75 8 5.95 7.75 7.75 5.95 8 2.75Z"
          />
          <path
            d="M14.25 11.25c.15 1.9 1.1 2.85 3 3-1.9.15-2.85 1.1-3 3-.15-1.9-1.1-2.85-3-3 1.9-.15 2.85-1.1 3-3Z"
          />
        </svg>
      }
      @case ('tax') {
        <svg viewBox="0 0 20 20" focusable="false">
          <circle cx="6.25" cy="6.25" r="2" />
          <circle cx="13.75" cy="13.75" r="2" />
          <path d="m5 15 10-10" />
        </svg>
      }
      @case ('terminal') {
        <svg viewBox="0 0 20 20" focusable="false">
          <rect x="2.5" y="3.25" width="15" height="13.5" rx="2" />
          <path d="m5.5 7 2.75 2.75-2.75 2.75M10.5 12.5h4" />
        </svg>
      }
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
