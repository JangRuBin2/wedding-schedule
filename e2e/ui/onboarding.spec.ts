import { expect, test } from "@playwright/test";
import { waitForHeading } from "../support/app";
import { clickStartWithTemplates, fillStartForm } from "../support/couple";
import { eventTitles, gotoEvents } from "../support/events";
import { createUser, loginAs } from "../support/seed";

/** 여정: 카카오로 처음 들어온 사람 → 시작하기 → 기본 일정으로 우리 커플 시작 */

test("커플이 없는 사람은 어느 화면을 열어도 시작하기로 간다", async ({ page, context }) => {
  await loginAs(context, await createUser());
  await page.goto("/events");
  await expect(page).toHaveURL(/\/start$/);
  await expect(page.getByRole("heading", { name: "Our Wedding" })).toBeVisible();
  await expect(page.getByText("상대가 먼저 시작했나요?")).toBeVisible();
});

test("결혼식 날짜·이름을 적고 기본 일정으로 시작하면 홈에 D-day 와 이름, 리스트에 기본 이벤트 20개", async ({ page, context }) => {
  await loginAs(context, await createUser("민준"));
  await page.goto("/start");
  await waitForHeading(page, "Our Wedding");
  await fillStartForm(page, { date: "2030-05-18", names: ["민준", "지은"] });
  await clickStartWithTemplates(page);

  await expect(page.getByText(/D-\d+/).first()).toBeVisible();
  await expect(page.getByText("민준 ♥ 지은").first()).toBeVisible();

  await gotoEvents(page);
  const titles = await eventTitles(page);
  expect(titles).toHaveLength(20);
  expect(titles).toContain("결혼식 당일");
});
