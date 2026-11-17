import { expect, type Locator, type Page } from "@playwright/test";
import { gotoPage } from "./app";

/** 리스트(이벤트) 단계 함수 */

export const gotoEvents = async (page: Page): Promise<void> => {
  await gotoPage(page, "/events", "리스트");
};

/** 리스트에 보이는 이벤트 제목들 (위에서부터) */
export const eventTitles = async (page: Page): Promise<string[]> =>
  page.locator("main ul.card > li").locator("span.block.truncate.font-semibold").allInnerTexts();

export const openReorder = async (page: Page): Promise<void> => {
  await page.getByRole("button", { name: "순서 바꾸기" }).click();
  await expect(page.getByText("≡ 를 끌어서 순서를 바꿔요")).toBeVisible();
};

export const clickMoveUp = (page: Page, title: string) => page.getByRole("button", { name: `${title} 위로` }).click();

export const clickReorderDone = async (page: Page): Promise<void> => {
  await page.getByRole("button", { name: "완료" }).click();
  await expect(page.getByRole("button", { name: "순서 바꾸기" })).toBeVisible();
};

export const eventCount = (page: Page): Locator => page.locator("main").getByText(/^\d+개$/).first();
