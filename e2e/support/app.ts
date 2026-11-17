import { expect, type Locator, type Page } from "@playwright/test";

/**
 * 화면 공통 단계 함수 (함수형 POM: 상태 없는 함수가 page 를 받는다. 이름은 goto/open/click/fill/choose/waitFor/expect 로 시작).
 * 화면은 열 때마다 서버에서 새로 그리고 그 사이 회색 스켈레톤(loading.tsx)이 보이므로, 늘 '그 화면의 제목'을 기다린다
 */

/** 화면 제목(h1)이 보일 때까지 — 스켈레톤이 끝난 신호 */
export const waitForHeading = async (page: Page, name: string | RegExp): Promise<void> => {
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
};

/** 경로로 들어가 그 화면 제목을 기다린다 */
export const gotoPage = async (page: Page, path: string, heading: string | RegExp): Promise<void> => {
  await page.goto(path);
  await waitForHeading(page, heading);
};

/** 아래(데스크톱은 위) 탭 */
export const navTab = (page: Page, label: "홈" | "리스트" | "예산" | "메모" | "마이"): Locator =>
  page.getByRole("navigation").getByRole("link", { name: label, exact: true });

/** 버튼 이름으로 누르기 (저장·완료 등) */
export const clickButton = (page: Page, name: string | RegExp): Promise<void> => page.getByRole("button", { name }).click();

/** 상세 화면으로 이동했는지 (주소가 바뀌고 제목이 보임) */
export const waitForUrl = async (page: Page, re: RegExp): Promise<void> => {
  await expect(page).toHaveURL(re);
};
