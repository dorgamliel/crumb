import { defineConfig, devices } from "@playwright/test";

// The tests write fixed local times ("2026-10-09T09:30:00") and the browser runs in UTC, so Node
// must parse them in UTC too, whatever the machine's own time zone is.
process.env.TZ = "UTC";

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
    // Routes cannot intercept requests a service worker makes; tests that need it opt back in.
    serviceWorkers: "block",
    // Lets the tests use an already-installed Chromium (CHROMIUM_PATH) where downloads are blocked.
    ...(process.env.CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.CHROMIUM_PATH } } : {}),
  },
  webServer: {
    command: "npm run build && npx vite preview --port 5188 --strictPort",
    url: "http://localhost:5188/",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
