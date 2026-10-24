// Dev-only test setup. `npm test` runs everything; nothing here is loaded by the app.
const { defineConfig, devices } = require('@playwright/test');

// let the tests' fake Firebase answer requests made by the service worker too (Chromium)
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';

const chromium = { browserName: 'chromium', locale: 'en-GB', timezoneId: 'Europe/Copenhagen' };

module.exports = defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  expect: { timeout: 5_000, toHaveScreenshot: { maxDiffPixelRatio: 0.002 } },
  fullyParallel: true,
  workers: 2,
  reporter: [['list']],
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  webServer: { command: 'node tests/server.js', port: 4173, reuseExistingServer: true },
  use: { baseURL: 'http://localhost:4173/cart-log/', serviceWorkers: 'block' },
  projects: [
    { name: 'unit', testDir: 'tests/unit' },
    // Pedro's phone: Android Chrome. Girlfriend's phone: iPhone (emulated in Chromium with the iPhone user agent).
    { name: 'android', testDir: 'tests/e2e', use: { ...devices['Pixel 7'], ...chromium } },
    { name: 'iphone', testDir: 'tests/e2e', use: { ...devices['iPhone 13'], ...chromium } },
  ],
});
