import { expect, test } from "@playwright/test";
import { clickMoveUp, clickReorderDone, eventTitles, gotoEvents, openReorder } from "../support/events";
import { createCouple, loginAs } from "../support/seed";

/** 리스트 순서 바꾸기: 바꾼 순서는 새로고침해도 남는다 */

test("▲ 로 옮기고 완료하면 순서가 저장된다", async ({ page, context }) => {
  const couple = await createCouple({ events: ["상견례", "웨딩홀 계약", "스드메"] });
  await loginAs(context, couple.owner);
  await gotoEvents(page);
  expect(await eventTitles(page)).toEqual(["상견례", "웨딩홀 계약", "스드메"]);

  await openReorder(page);
  await clickMoveUp(page, "스드메");
  await clickMoveUp(page, "스드메");
  await clickReorderDone(page);

  await page.reload();
  await gotoEvents(page);
  expect(await eventTitles(page)).toEqual(["스드메", "상견례", "웨딩홀 계약"]);
});
