import { expect, test } from "@playwright/test";
import { clickSaveNote, clickToolbar, drawStroke, fillNoteTitle, gotoNewNote, typeNoteBody } from "../support/notes";
import { createCouple, loginAs } from "../support/seed";

/** 여정: 메모에 글·체크리스트·손그림을 넣고 저장하면 보기 화면에 그대로 */

test("글·체크리스트·그림을 넣은 메모가 보기 화면과 목록에 남는다", async ({ page, context }) => {
  const couple = await createCouple();
  await loginAs(context, couple.owner);

  await gotoNewNote(page);
  await fillNoteTitle(page, "드레스 투어");
  await typeNoteBody(page, "업체에 물어볼 것");
  await page.keyboard.press("Enter");
  await clickToolbar(page, "체크리스트");
  await page.keyboard.type("피팅비 따로인지");
  await drawStroke(page);
  await clickSaveNote(page, "드레스 투어");

  const article = page.locator("article");
  await expect(article.getByText("업체에 물어볼 것")).toBeVisible();
  await expect(article.locator('li[data-type="taskItem"]', { hasText: "피팅비 따로인지" })).toBeVisible();
  await expect(article.locator(".note-drawing svg path")).toHaveCount(1);

  await page.goto("/notes");
  await expect(page.getByRole("link", { name: /드레스 투어/ })).toContainText("그림 1");
});
