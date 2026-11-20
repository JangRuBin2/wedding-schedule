import { expect, test } from "@playwright/test";
import { gotoPage, waitForHeading } from "../support/app";
import { budgetStat, categoryRow, clickSaveExpense, fillNewExpense, formError, gotoBudget, gotoNewExpense } from "../support/money";
import { createCouple, createExpense, loginAs } from "../support/seed";

/**
 * 여정: 결제 예정을 적고 → 예산에 '결제 예정'으로 잡히고 → 상세에서 결제 완료 → '지출'로 옮겨짐.
 * 결제와 지출이 한 기록이라 같은 돈이 두 번 잡히지 않는다 (예전 40만+40만=80만 문제)
 */

test("결제 예정 → 결제 완료로 바꾸면 예산의 예정에서 지출로 옮겨지고 합계는 한 번만", async ({ page, context }) => {
  const couple = await createCouple();
  await loginAs(context, couple.owner);

  await gotoNewExpense(page, "planned=1");
  await fillNewExpense(page, "플래너", [{ amount: "400000", date: "2027-01-10" }]);
  await clickSaveExpense(page, "플래너 계약금");
  await expect(page.getByText(/결제 예정 · /)).toBeVisible();

  await gotoBudget(page);
  await expect(budgetStat(page, "결제 예정")).toHaveText("40만 원");
  await expect(budgetStat(page, "지출")).toHaveText("0원");
  // 목록에는 결제 완료 버튼이 없다 (상세에서만 바꿈)
  await expect(page.getByRole("button", { name: "결제 완료" })).toHaveCount(0);

  await page.getByRole("link", { name: /플래너 계약금/ }).first().click();
  await waitForHeading(page, "플래너 계약금");
  await page.getByRole("button", { name: "결제 완료로 바꾸기" }).click();
  await expect(page.getByText("결제 완료", { exact: true }).first()).toBeVisible();

  await gotoBudget(page);
  await expect(budgetStat(page, "지출")).toHaveText("40만 원");
  await expect(budgetStat(page, "결제 예정")).toHaveText("0원");
});

test("금액 없이 적은 결제 예정은 결제 완료 전에 금액부터 받는다", async ({ page, context }) => {
  const couple = await createCouple();
  await loginAs(context, couple.owner);
  await gotoNewExpense(page, "planned=1");
  // 잔금 칸에 날짜만 (금액 미정)
  await fillNewExpense(page, "스냅", [{ n: 2, date: "2027-02-01" }]);
  await clickSaveExpense(page, "스냅 잔금");
  await expect(page.getByText("금액 미정")).toBeVisible();
  await page.getByRole("link", { name: "금액 넣고 결제 완료로 바꾸기" }).click();
  await waitForHeading(page, "결제 예정 수정");
  // 결제 완료가 골라진 채로 열리고 금액이 필수
  await expect(page.getByRole("button", { name: "잔금 결제 완료" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#expense-amount")).toHaveAttribute("required", "");
});

test("예산의 카테고리를 누르면 그 카테고리 결제·지출만 보인다", async ({ page, context }) => {
  const couple = await createCouple();
  await createExpense(couple, "드레스 잔금", { amount: 1_200_000, category: "스드메" });
  await createExpense(couple, "식대", { amount: 3_000_000, category: "예식" });
  await loginAs(context, couple.owner);

  await gotoBudget(page);
  await categoryRow(page, "스드메").click();
  await waitForHeading(page, "스드메 결제·지출");
  await expect(page.getByText("드레스 잔금")).toBeVisible();
  await expect(page.getByText("식대")).toHaveCount(0);
});

test("결제 칸을 하나도 안 적으면 저장되지 않는다", async ({ page, context }) => {
  const couple = await createCouple();
  await loginAs(context, couple.owner);
  await gotoNewExpense(page);
  await fillNewExpense(page, "금액 빠짐", []);
  await page.getByRole("button", { name: "저장" }).click();
  await expect(formError(page)).toContainText("결제 금액이나 날짜를 하나 이상 적어 주세요");
  await expect(page).toHaveURL(/\/expenses\/new/);
  await gotoPage(page, "/expenses", "결제·지출 내역");
  await expect(page.getByText("금액 빠짐")).toHaveCount(0);
});

test("계약금·잔금 칸을 같이 적으면 두 건이 각각 상태대로 저장된다", async ({ page, context }) => {
  const couple = await createCouple();
  await loginAs(context, couple.owner);
  await gotoNewExpense(page);
  await fillNewExpense(page, "드레스", [{ amount: "300000" }, { n: 2, amount: "1200000", date: "2027-03-10" }]);
  await page.getByRole("button", { name: "저장" }).click();
  await waitForHeading(page, "결제·지출 내역");
  await expect(page.getByText("드레스 계약금")).toBeVisible();
  await expect(page.getByText("드레스 잔금")).toBeVisible();

  await gotoBudget(page);
  await expect(budgetStat(page, "지출")).toHaveText("30만 원");
  await expect(budgetStat(page, "결제 예정")).toHaveText("120만 원");
});

test("수정 화면에서도 결제 칸이 나뉘어 있어, 계약금을 고치다 잔금을 더하면 한 건 더 생긴다", async ({ page, context }) => {
  const couple = await createCouple();
  await loginAs(context, couple.owner);
  await gotoNewExpense(page);
  await fillNewExpense(page, "헤어 메이크업", [{ amount: "300000" }]);
  await clickSaveExpense(page, "헤어 메이크업 계약금");

  await page.getByRole("link", { name: "수정", exact: true }).click();
  await expect(page.locator("#expense-title")).toHaveValue("헤어 메이크업");
  await expect(page.locator("#expense-amount")).toHaveValue("300,000");
  // 비어 있는 잔금 칸에 적고 저장 → 연 건(계약금) 상세로 돌아오고, 잔금이 새로 생김
  await page.locator("#expense-amount-2").fill("700000");
  await page.locator("#expense-date-2").fill("2027-04-01");
  await page.getByRole("button", { name: "저장" }).click();
  await waitForHeading(page, "헤어 메이크업 계약금");

  await gotoBudget(page);
  await expect(budgetStat(page, "지출")).toHaveText("30만 원");
  await expect(budgetStat(page, "결제 예정")).toHaveText("70만 원");

  // 잔금을 열면 계약금도 같이 보임
  await page.getByRole("link", { name: /헤어 메이크업 잔금/ }).first().click();
  await waitForHeading(page, "헤어 메이크업 잔금");
  await page.getByRole("link", { name: "수정", exact: true }).click();
  await expect(page.locator("#expense-amount")).toHaveValue("700,000");
  await expect(page.locator("#expense-amount-2")).toHaveValue("300,000");
});
