import { expect, test } from "@playwright/test";
import { waitForHeading } from "../support/app";
import { createCouple, createEvent, createTask, loginAs } from "../support/seed";

/**
 * 커피 한 잔 안내: 열심히 쓰는 사람에게만 (가입 14일·쓴 날 5일·끝낸 일 10개), 거절은 기억, 플레이스토어 앱 안에선 안 보임
 */

const DAY = 86_400_000;
const popup = (page: import("@playwright/test").Page) => page.getByRole("dialog", { name: /도움이 되고 있나요/ });

const engagedCouple = async () => {
  const couple = await createCouple({ ownerCreatedAt: new Date(Date.now() - 30 * DAY), ownerActiveDays: 6 });
  const ev = await createEvent(couple, "드레스 투어", { done: true });
  for (let i = 0; i < 9; i++) await createTask(ev.id, `할 일 ${i}`, true);
  return couple;
};

test("열심히 쓰는 사람에게 홈에서 뜨고, '나중에'를 누르면 다시 안 뜬다", async ({ page, context }) => {
  await loginAs(context, (await engagedCouple()).owner);
  await page.goto("/");
  await expect(popup(page)).toBeVisible();
  await expect(popup(page).getByRole("link", { name: /커피 한 잔 보내기/ })).toHaveAttribute("href", /^https:\/\/qr\.kakaopay\.com\//);
  await popup(page).getByRole("button", { name: "나중에" }).click();
  await expect(popup(page)).toHaveCount(0);
  await page.reload();
  await waitForHeading(page, /Our Wedding/);
  await expect(popup(page)).toHaveCount(0);
});

test("막 가입한 사람에게는 안 뜨지만, 마이에서 언제든 후원할 수 있다", async ({ page, context }) => {
  await loginAs(context, (await createCouple()).owner);
  await page.goto("/");
  await waitForHeading(page, /Our Wedding/);
  await expect(popup(page)).toHaveCount(0);
  await page.goto("/settings");
  await page.getByRole("link", { name: /개발자에게 커피 한 잔/ }).click();
  await waitForHeading(page, "개발자에게 커피 한 잔");
});

test("플레이스토어 앱(?app=twa)으로 열면 안내도 메뉴도 없다 (Play 결제 정책)", async ({ page, context }) => {
  await loginAs(context, (await engagedCouple()).owner);
  await page.goto("/?app=twa");
  await waitForHeading(page, /Our Wedding/);
  await expect(popup(page)).toHaveCount(0);
  await page.goto("/settings");
  await waitForHeading(page, "마이");
  await expect(page.getByRole("link", { name: /개발자에게 커피 한 잔/ })).toHaveCount(0);
});
