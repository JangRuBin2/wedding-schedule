import { expect, type Page } from "@playwright/test";
import { gotoPage, waitForHeading } from "./app";

/** 시작하기·초대·커플 나가기 단계 함수 */

export const fillStartForm = async (page: Page, v: { date?: string; names?: [string, string] }): Promise<void> => {
  if (v.date) await page.locator('input[name="date"]').fill(v.date);
  if (v.names) {
    await page.getByPlaceholder("예: 민준").fill(v.names[0]);
    await page.getByPlaceholder("예: 지은").fill(v.names[1]);
  }
};

export const clickStartWithTemplates = async (page: Page): Promise<void> => {
  await page.getByRole("button", { name: "기본 일정으로 시작하기" }).click();
  await waitForHeading(page, /Our Wedding/);
};

/** 마이 화면의 초대 링크 */
export const readInviteLink = async (page: Page): Promise<string> => {
  await gotoPage(page, "/settings", "마이");
  const link = (await page.getByText(/\/join\/[A-Z0-9]+$/).textContent())!.trim();
  return new URL(link).pathname;
};

export const memberNames = (page: Page) => page.locator("section").filter({ has: page.getByRole("heading", { name: "우리 커플" }) }).locator("li");

export const clickJoin = async (page: Page): Promise<void> => {
  await page.getByRole("button", { name: "같이 쓰기 시작" }).click();
  await waitForHeading(page, /Our Wedding/);
};

/** 커플 나가기 (계정 삭제까지 하면 deleteAccount) */
export const leaveCouple = async (page: Page, opts: { deleteAccount: boolean }): Promise<void> => {
  await gotoPage(page, "/settings/leave", "커플 나가기 · 계정 삭제");
  const box = page.getByRole("checkbox", { name: "계정도 삭제하기" });
  if (opts.deleteAccount) await box.check();
  else await box.uncheck();
  await page.getByPlaceholder("나가기 / 계정 삭제").fill(opts.deleteAccount ? "계정 삭제" : "나가기");
  await page.getByRole("button", { name: "진행하기" }).click();
};

export const expectOnLogin = async (page: Page): Promise<void> => {
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("link", { name: "카카오 로그인" })).toBeVisible();
};
