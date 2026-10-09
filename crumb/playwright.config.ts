import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  timeout: 45_000,
  fullyParallel: true,
  workers: 4,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5188/",
    locale: "he-IL",
    // Matches Node, which parses the fixed test times below as local times.
    timezoneId: "UTC",
    ...devices["Pixel 7"],
    viewport: { width: 390, height: 844 },
  },
  webServer: {
    command: "npx vite build && npx vite preview --port 5188 --strictPort",
    url: "http://localhost:5188/",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
