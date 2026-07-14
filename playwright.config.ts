import { defineConfig, devices } from '@playwright/test';

const port = 4200;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : [['list']],
  expect: {
    // Small tolerance for font antialiasing only. Anything looser lets real
    // regressions through: a restyled label is well under 1% of a full page.
    toHaveScreenshot: { maxDiffPixels: 100 },
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'functional',
      testDir: 'e2e/functional',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'a11y',
      testDir: 'e2e/a11y',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Snapshots are pixel comparisons, so the viewport and the device scale
      // factor must stay identical across machines for baselines to match.
      name: 'visual',
      testDir: 'e2e/visual',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: `npm start -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
