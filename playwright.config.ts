import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 8_000
  },
  use: {
    baseURL: "http://127.0.0.1:5177",
    trace: "retain-on-failure"
  },
  webServer: {
    command: "npm run dev -- --port 5177 --strictPort",
    url: "http://127.0.0.1:5177",
    reuseExistingServer: false,
    timeout: 120_000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 940 } }
    }
  ]
});
