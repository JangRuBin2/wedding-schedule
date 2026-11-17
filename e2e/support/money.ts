import { expect, type Locator, type Page } from "@playwright/test";
import { gotoPage, waitForHeading } from "./app";

/** 결제·지출·예산 단계 함수 */

export type FileSpec = { name: string; mimeType: string; buffer: Buffer };

export const gotoNewExpense = (page: Page, query = "") => gotoPage(page, `/expenses/new${query ? `?${query}` : ""}`, "결제·지출 기록");

export const chooseStatus = (page: Page, status: "결제 완료" | "결제 예정") => page.locator("label").filter({ hasText: status }).first().click();

export const fillExpense = async (page: Page, v: { title: string; amount?: string; date?: string }): Promise<void> => {
  await page.locator("#expense-title").fill(v.title);
  if (v.amount !== undefined) await page.locator("#expense-amount").fill(v.amount);
  if (v.date) await page.locator('input[name="date"]').fill(v.date);
};

/** 첨부 고르기 (이미지·파일). 고른 직후 생기는 칸이나 오류 문구로 확인 */
export const attachFiles = (page: Page, files: FileSpec[]) => page.locator('input[type="file"]').setInputFiles(files);

export const attachmentTiles = (page: Page): Locator => page.locator("form li").filter({ has: page.getByRole("button", { name: /빼기$/ }) });

export const formError = (page: Page): Locator => page.locator("form [role=alert]");

/** 저장 → 상세 화면 */
export const clickSaveExpense = async (page: Page, title: string): Promise<void> => {
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page).toHaveURL(/\/expenses\/[a-z0-9]{20,}$/, { timeout: 60_000 });
  await waitForHeading(page, title);
};

/** 예산 화면 위쪽 숫자 칸 (지출 / 결제 예정 / 잔액) */
export const budgetStat = (page: Page, label: "지출" | "결제 예정" | "잔액" | "초과"): Locator =>
  page.locator("section.hero dl > div").filter({ has: page.locator("dt", { hasText: new RegExp(`^${label}$`) }) }).locator("dd");

export const gotoBudget = (page: Page) => gotoPage(page, "/budget", "예산");

export const categoryRow = (page: Page, name: string): Locator =>
  page.locator("section").filter({ has: page.getByRole("heading", { name: /카테고리별/ }) }).getByRole("link", { name: new RegExp(name) });

/** 첨부 파일 내려받기 링크 (상세 화면) */
export const fileLink = (page: Page, name: string): Locator => page.locator("main a[href^='/api/receipts/']", { hasText: name });

export const fakePdf = (name: string, size: number): FileSpec => {
  const buffer = Buffer.alloc(size, 7);
  buffer.write("%PDF-1.4\n");
  return { name, mimeType: "application/pdf", buffer };
};
