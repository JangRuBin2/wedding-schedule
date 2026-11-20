import { expect, type Locator, type Page } from "@playwright/test";
import { gotoPage, waitForHeading } from "./app";

/** 결제·지출·예산 단계 함수 */

export type FileSpec = { name: string; mimeType: string; buffer: Buffer };

export const gotoNewExpense = (page: Page, query = "") => gotoPage(page, `/expenses/new${query ? `?${query}` : ""}`, "결제·지출 기록");

export const chooseStatus = (page: Page, status: "결제 완료" | "결제 예정") => page.locator("label").filter({ hasText: status }).first().click();

/**
 * 새 기록 화면: 항목 이름 + 결제 칸(1번째 계약금, 2번째 잔금…). n 은 몇 번째 결제 칸인지 (1부터).
 * 결제마다 제목은 '항목 + 결제 이름' (예: 플래너 + 계약금 → 플래너 계약금), 상세 화면 제목은 항목 이름
 */
export const fillNewExpense = async (page: Page, title: string, parts: { n?: number; amount?: string; date?: string}[]): Promise<void> => {
  await page.locator("#expense-title").fill(title);
  for (const p of parts) {
    const sfx = !p.n || p.n === 1 ? "" : `-${p.n}`;
    if (p.amount !== undefined) await page.locator(`#expense-amount${sfx}`).fill(p.amount);
    if (p.date) await page.locator(`#expense-date${sfx}`).fill(p.date);
  }
};

/** 수정 화면 (한 건) */
export const fillExpense = async (page: Page, v: { title: string; amount?: string; date?: string }): Promise<void> => {
  await page.locator("#expense-title").fill(v.title);
  if (v.amount !== undefined) await page.locator("#expense-amount").fill(v.amount);
  if (v.date) await page.locator('input[name="date"]').fill(v.date);
};

/** 결제 칸(n 번째, 1부터)의 메모·첨부를 펼침 (이미 펼쳐져 있으면 그대로) */
export const openExtras = async (page: Page, n = 1): Promise<void> => {
  const more = page.locator("form fieldset > div.rounded-xl").nth(n - 1).getByRole("button", { name: /^\+ 메모·첨부/ });
  if (await more.count()) await more.click();
};

/** 첨부 고르기 (이미지·파일), n 번째 결제 칸에. 고른 직후 생기는 칸이나 오류 문구로 확인 */
export const attachFiles = async (page: Page, files: FileSpec[], n = 1): Promise<void> => {
  await openExtras(page, n);
  await page.locator("form fieldset > div.rounded-xl").nth(n - 1).locator('input[type="file"]').setInputFiles(files);
};

export const attachmentTiles = (page: Page): Locator => page.locator("form li").filter({ has: page.getByRole("button", { name: /빼기$/ }) });

export const formError = (page: Page): Locator => page.locator("form [role=alert]");

/** 저장 → 상세 화면 (제목은 항목 이름) */
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
/** 상세 화면의 결제 카드 (계약금·잔금…) */
export const payCard = (page: Page, label: string): Locator => page.locator("main article").filter({ has: page.getByRole("heading", { name: label, exact: true }) });

export const fileLink = (page: Page, name: string): Locator => page.locator("main a[href^='/api/receipts/']", { hasText: name });

export const fakePdf = (name: string, size: number): FileSpec => {
  const buffer = Buffer.alloc(size, 7);
  buffer.write("%PDF-1.4\n");
  return { name, mimeType: "application/pdf", buffer };
};
