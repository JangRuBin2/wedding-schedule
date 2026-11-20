import { expect, test } from "@playwright/test";
import { gotoPage, waitForHeading } from "../support/app";
import { budgetStat, categoryRow, clickSaveExpense, fillNewExpense, formError, gotoBudget, gotoNewExpense, openExtras, payCard } from "../support/money";
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
  await clickSaveExpense(page, "플래너");
  await expect(payCard(page, "계약금").getByText(/결제 예정 · /)).toBeVisible();

  await gotoBudget(page);
  await expect(budgetStat(page, "결제 예정")).toHaveText("40만 원");
  await expect(budgetStat(page, "지출")).toHaveText("0원");
  // 목록에는 결제 완료 버튼이 없다 (상세에서만 바꿈)
  await expect(page.getByRole("button", { name: "결제 완료" })).toHaveCount(0);

  await page.getByRole("link", { name: /플래너 계약금/ }).first().click();
  await waitForHeading(page, "플래너");
  await payCard(page, "계약금").getByRole("button", { name: "결제 완료로 바꾸기" }).click();
  await expect(payCard(page, "계약금").getByText("결제 완료", { exact: true })).toBeVisible();

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
  await clickSaveExpense(page, "스냅");
  await expect(payCard(page, "잔금").getByText("금액 미정")).toBeVisible();
  await page.getByRole("link", { name: "금액 넣고 결제 완료로 바꾸기" }).click();
  await waitForHeading(page, "결제·지출 수정");
  // 그 결제가 결제 완료로 골라진 채로 열리고 금액이 필수
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

test("항목 하나에 계약금·잔금: 상세·내역에 둘 다 보이고, 메모는 결제마다", async ({ page, context }) => {
  const couple = await createCouple();
  await loginAs(context, couple.owner);
  await gotoNewExpense(page);
  await fillNewExpense(page, "스튜디오", [{ amount: "900000" }, { n: 2, amount: "900000", date: "2027-07-10" }]);
  await openExtras(page, 2);
  await page.locator("#expense-memo-2").fill("촬영 당일 현금");
  await clickSaveExpense(page, "스튜디오");
  await expect(payCard(page, "계약금")).toContainText("900,000원");
  await expect(payCard(page, "잔금")).toContainText("900,000원");
  await expect(payCard(page, "잔금")).toContainText("촬영 당일 현금");
  await expect(payCard(page, "계약금")).not.toContainText("촬영 당일 현금");

  await gotoPage(page, "/expenses", "결제·지출 내역");
  const card = page.locator("main article").filter({ hasText: "스튜디오" });
  await expect(card).toHaveCount(1);
  await expect(card).toContainText("계약금");
  await expect(card).toContainText("잔금");

  await gotoBudget(page);
  await expect(budgetStat(page, "지출")).toHaveText("90만 원");
  await expect(budgetStat(page, "결제 예정")).toHaveText("90만 원");
});

test("수정 화면에서 잔금을 더하고, 저장된 결제를 지울 수 있다", async ({ page, context }) => {
  const couple = await createCouple();
  await loginAs(context, couple.owner);
  await gotoNewExpense(page);
  await fillNewExpense(page, "헤어 메이크업", [{ amount: "300000" }]);
  await clickSaveExpense(page, "헤어 메이크업");

  await page.getByRole("link", { name: "수정", exact: true }).click();
  await expect(page.locator("#expense-title")).toHaveValue("헤어 메이크업");
  await expect(page.locator("#expense-amount")).toHaveValue("300,000");
  // 비어 있는 잔금 칸에 적고 저장 → 잔금이 새로 생김
  await page.locator("#expense-amount-2").fill("700000");
  await page.locator("#expense-date-2").fill("2027-04-01");
  await clickSaveExpense(page, "헤어 메이크업");
  await expect(payCard(page, "잔금")).toContainText("700,000원");

  await gotoBudget(page);
  await expect(budgetStat(page, "지출")).toHaveText("30만 원");
  await expect(budgetStat(page, "결제 예정")).toHaveText("70만 원");

  // 수정 화면에서 잔금 ✕ → 저장하면 지워짐
  await page.getByRole("link", { name: /헤어 메이크업 잔금/ }).first().click();
  await waitForHeading(page, "헤어 메이크업");
  await page.getByRole("link", { name: "수정", exact: true }).click();
  await page.getByRole("button", { name: "잔금 결제 지우기" }).click();
  await expect(page.getByText(/저장하면 잔금 결제가 지워져요/)).toBeVisible();
  await clickSaveExpense(page, "헤어 메이크업");
  await expect(payCard(page, "잔금")).toHaveCount(0);
  await gotoBudget(page);
  await expect(budgetStat(page, "결제 예정")).toHaveText("0원");

  // 상세 화면에서 결제 하나 삭제 (마지막이면 항목도 없어짐)
  await page.getByRole("link", { name: /헤어 메이크업 계약금/ }).first().click();
  await waitForHeading(page, "헤어 메이크업");
  page.once("dialog", (d) => d.accept());
  await payCard(page, "계약금").getByRole("button", { name: "삭제" }).click();
  await waitForHeading(page, "결제·지출 내역");
  await expect(page.getByText("헤어 메이크업")).toHaveCount(0);
});
