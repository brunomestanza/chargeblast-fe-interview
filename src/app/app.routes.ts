import { Routes } from '@angular/router';

const loadMockPage = () => import('./mock-page/mock-page').then(({ MockPage }) => MockPage);

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./payments-page/payments-page').then(({ PaymentsPage }) => PaymentsPage),
    title: 'Payments | Chargeblast',
  },
  {
    path: 'payments/:paymentId',
    loadComponent: () =>
      import('./payment-details-page/payment-details-page').then(
        ({ PaymentDetailsPage }) => PaymentDetailsPage,
      ),
    title: 'Payment details | Chargeblast',
  },
  {
    path: 'customers',
    loadComponent: loadMockPage,
    title: 'Customers | Chargeblast',
  },
  {
    path: 'balances',
    loadComponent: loadMockPage,
    title: 'Balances | Chargeblast',
  },
  {
    path: 'product-catalog',
    loadComponent: loadMockPage,
    title: 'Product Catalog | Chargeblast',
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./settings-page/settings-page').then(({ SettingsPage }) => SettingsPage),
    title: 'Settings | Chargeblast',
  },
  {
    path: 'mock',
    loadComponent: loadMockPage,
    title: 'Unavailable | Chargeblast',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
