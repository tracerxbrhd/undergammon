import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/browser',
  testMatch: '*.spec.ts',
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 390, height: 844 },
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'node tests/browser/server.mjs',
      url: 'http://127.0.0.1:3000/health',
      reuseExistingServer: false,
    },
    {
      command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1',
      cwd: 'apps/miniapp',
      url: 'http://localhost:5173',
      reuseExistingServer: false,
    },
  ],
});
