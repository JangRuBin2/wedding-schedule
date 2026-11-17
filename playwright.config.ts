import { defineConfig, devices } from "@playwright/test";
import { appEnv, assertSafeDatabase, BASE_URL, E2E_PORT } from "./e2e/env";

/**
 * E2E 설정 (bx_store 의 e2e 구성을 따름: docs/e2e.md).
 *
 * 프로젝트
 *  - http    : 브라우저 없이 요청만 (로그인 이동·공개 주소·커플 격리). 화면 폭과 무관
 *  - desktop : 1440 폭
 *  - mobile  : 430 폭, 터치 — 봄날은 휴대폰이 주 사용처
 *
 * 테스트 DB 는 global-setup 이 스키마만 맞추고(지우지 않음), 각 테스트는 자기 커플·사용자를 새로 만들어 쓴다(e2e/support/seed.ts).
 * 그래서 병렬로 돌아도 서로의 데이터를 건드리지 않는다
 */
assertSafeDatabase();
Object.assign(process.env, appEnv);

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.results",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // CI 재시도는 flaky 를 리포트에 드러내는 용도 (덮으려고 늘리지 않기)
  retries: process.env.CI ? 2 : 0,
  // dev 서버는 첫 요청에 화면을 컴파일해서, 병렬이 많으면 컴파일 대기로 타임아웃이 남
  workers: process.env.CI ? 2 : 3,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { outputFolder: "./e2e/.report", open: "never" }]],
  use: {
    baseURL: BASE_URL,
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "http", testDir: "./e2e/http" },
    { name: "desktop", testDir: "./e2e/ui", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    {
      name: "mobile",
      testDir: "./e2e/ui",
      use: { ...devices["Desktop Chrome"], viewport: { width: 430, height: 900 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // CI 는 빌드한 결과로(빠르고 실제와 같음), 로컬은 dev 서버로
        command: process.env.CI ? `npm run start -- -p ${E2E_PORT}` : `npm run dev -- -p ${E2E_PORT}`,
        url: `${BASE_URL}/privacy`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: { ...appEnv, NEXT_TELEMETRY_DISABLED: "1" },
      },
});
