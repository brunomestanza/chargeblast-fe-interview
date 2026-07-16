import type { DashboardIconName } from '../sidebar/dashboard-icon.types';

interface SettingsItem {
  readonly name: string;
  readonly description: string;
  readonly icon: DashboardIconName;
  readonly startsRow?: true;
}

interface SettingsSection {
  readonly title: string;
  readonly items: readonly SettingsItem[];
}

export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  {
    title: 'Personal settings',
    items: [
      {
        name: 'Personal details',
        description: 'Contact details, password, authentication methods, and your active sessions.',
        icon: 'profile',
      },
      {
        name: 'Communication preferences',
        description: 'Customize the emails, SMS, and push notifications you receive.',
        icon: 'communication',
      },
      {
        name: 'Developers',
        description: 'Workbench, developer tools, and more.',
        icon: 'terminal',
      },
    ],
  },
  {
    title: 'Account settings',
    items: [
      {
        name: 'Business',
        description: 'Account details, business information, and payouts.',
        icon: 'business',
      },
      {
        name: 'Team and security',
        description: 'Team members, roles, and account security.',
        icon: 'security',
      },
      {
        name: 'Chargeblast profile',
        description: 'Manage how you appear on the Chargeblast business network.',
        icon: 'profile',
      },
      {
        name: 'Your plans',
        description: 'Manage your Chargeblast plan.',
        icon: 'payments',
      },
      {
        name: 'Compliance and documents',
        description: 'Compliance documents and account exports.',
        icon: 'documents',
      },
      {
        name: 'Product previews',
        description: 'Try new features before release.',
        icon: 'sandbox',
      },
      {
        name: 'Perks',
        description: 'Offers available to your business.',
        icon: 'sparkles',
      },
    ],
  },
  {
    title: 'Product settings',
    items: [
      {
        name: 'Billing',
        description: 'Subscriptions, invoices, quotes, and customer portal.',
        icon: 'receipt',
      },
      {
        name: 'Identity',
        description: 'Identity verification and protection.',
        icon: 'identity',
      },
      {
        name: 'Tax',
        description: 'Tax addresses, codes, behavior, and integrations.',
        icon: 'tax',
      },
      {
        name: 'Connect',
        description: 'Manage your platform and connected accounts.',
        icon: 'connect',
      },
      {
        name: 'Payments',
        description: 'Checkout, payment methods, currency conversion, and more.',
        icon: 'payments',
      },
      {
        name: 'Discover more features',
        description: 'Browse more tools for your business.',
        icon: 'plus',
      },
      {
        name: 'Data Pipeline',
        description: 'Data warehouse and contact updates for processing.',
        icon: 'data-pipeline',
      },
      {
        name: 'Radar',
        description: 'Fraud protection and account rules.',
        icon: 'radar',
      },
      {
        name: 'Financial Connections',
        description: 'Financial data and authentication tools.',
        icon: 'balances',
        startsRow: true,
      },
      {
        name: 'Sigma',
        description: 'Explore and manage your Sigma features.',
        icon: 'sigma',
      },
    ],
  },
];
