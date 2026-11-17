import { expect, type Page } from "@playwright/test";
import { gotoPage, waitForHeading } from "./app";

/** 메모 단계 함수 */

/** 에디터는 화면이 뜬 뒤 브라우저에서 따로 준비된다 — 도구 막대가 생기면 준비 끝 */
export const waitForEditor = async (page: Page): Promise<void> => {
  await expect(page.getByRole("toolbar", { name: "글 꾸미기" }).getByRole("button", { name: "체크리스트" })).toBeVisible();
};

export const gotoNewNote = async (page: Page): Promise<void> => {
  await gotoPage(page, "/notes/new", "새 메모");
  await waitForEditor(page);
};

export const fillNoteTitle = (page: Page, title: string) => page.getByRole("textbox", { name: "제목" }).fill(title);

/** 본문에 글 쓰기. 커서가 본문에 들어간 걸 확인하고 친다 (제목 칸에 섞여 들어가지 않게) */
export const typeNoteBody = async (page: Page, text: string): Promise<void> => {
  const body = page.getByRole("textbox", { name: "메모 내용" });
  await body.click();
  await expect(body).toBeFocused();
  await page.keyboard.type(text);
};

export const clickToolbar = (page: Page, label: string) => page.getByRole("toolbar", { name: "글 꾸미기" }).getByRole("button", { name: label }).click();

/** 그리기 모드에서 선 하나 긋고 완료 */
export const drawStroke = async (page: Page): Promise<void> => {
  await page.getByRole("toolbar", { name: "글 꾸미기" }).getByRole("button", { name: "그리기" }).click();
  const pad = page.getByRole("dialog", { name: "그리기" });
  await expect(pad).toBeVisible();
  const box = (await pad.locator("svg.draw-paper").boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.3);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.6, { steps: 12 });
  await page.mouse.up();
  await pad.getByRole("button", { name: "완료" }).click();
  await expect(pad).toHaveCount(0);
};

export const clickSaveNote = async (page: Page, title: string): Promise<void> => {
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page).toHaveURL(/\/notes\/[a-z0-9]{20,}$/);
  await waitForHeading(page, title);
};
