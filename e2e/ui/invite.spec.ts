import { expect, test } from "@playwright/test";
import { gotoPage } from "../support/app";
import { clickJoin, leaveCouple, memberNames, readInviteLink } from "../support/couple";
import { eventTitles, gotoEvents } from "../support/events";
import { createCouple, createUser, loginAs } from "../support/seed";

/** 여정: 만든 사람이 초대 링크를 보내고 → 상대가 합류해 같은 일정을 보고 → 나가면 다시 혼자 */

test("초대 링크로 합류하면 같은 일정을 보고, 나가면 멤버에서 빠진다", async ({ browser }) => {
  const couple = await createCouple({ names: ["민준", "지은"], events: ["웨딩홀 투어"] });
  const partner = await createUser("지은");

  const ownerCtx = await browser.newContext();
  await loginAs(ownerCtx, couple.owner);
  const owner = await ownerCtx.newPage();
  const invitePath = await readInviteLink(owner);
  expect(invitePath).toBe(`/join/${couple.inviteCode}`);

  const partnerCtx = await browser.newContext();
  await loginAs(partnerCtx, partner);
  const p = await partnerCtx.newPage();
  await p.goto(invitePath);
  await expect(p.getByText("민준 ♥ 지은")).toBeVisible();
  await clickJoin(p);
  await gotoEvents(p);
  expect(await eventTitles(p)).toContain("웨딩홀 투어");

  await gotoPage(owner, "/settings", "마이");
  await expect(memberNames(owner).filter({ hasText: "지은" })).toHaveCount(1);

  await leaveCouple(p, { deleteAccount: false });
  await expect(p).toHaveURL(/\/start$/);
  await gotoPage(owner, "/settings", "마이");
  await expect(memberNames(owner).filter({ hasText: "지은" })).toHaveCount(0);
  await ownerCtx.close();
  await partnerCtx.close();
});

test("틀린 초대 코드는 안내만 하고 합류 버튼이 없다", async ({ page, context }) => {
  await loginAs(context, await createUser());
  await page.goto("/join/NOPE1234");
  await expect(page.getByRole("heading", { name: "초대 링크를 확인해 주세요" })).toBeVisible();
  await expect(page.getByRole("button", { name: "같이 쓰기 시작" })).toHaveCount(0);
});

test("계정 삭제하면 로그아웃되고, 혼자였던 커플 데이터도 사라진다", async ({ page, context }) => {
  const couple = await createCouple({ events: ["지울 이벤트"] });
  await loginAs(context, couple.owner);
  await leaveCouple(page, { deleteAccount: true });
  await expect(page).toHaveURL(/\/login/);
  // 같은 쿠키로 다시 들어가도 로그인으로 (계정이 없음)
  await loginAs(context, couple.owner);
  await page.goto("/events");
  await expect(page).toHaveURL(/\/login/);
});
