import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardIcon } from '../sidebar/dashboard-icon';

@Component({
  selector: 'app-mock-page',
  imports: [DashboardIcon, RouterLink],
  template: `
    <section class="mock-page" aria-labelledby="mock-page-title">
      <div class="mock-page__card">
        <span class="mock-page__icon" aria-hidden="true">
          <app-dashboard-icon name="layers" />
        </span>
        <h1 id="mock-page-title">In this implementation this screen is only an mock.</h1>
        <a class="mock-page__back" routerLink="/">
          <app-dashboard-icon name="arrow-left" />
          Back to home
        </a>
      </div>
    </section>
  `,
  styleUrl: './mock-page.css',
})
export class MockPage {}
