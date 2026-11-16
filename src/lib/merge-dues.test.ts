import assert from "node:assert/strict";
import { test } from "node:test";
import { planDueMerge, type OldDue } from "./merge-dues";

const due = (o: Partial<OldDue>): OldDue => ({
  id: "d",
  eventId: "e1",
  eventCategory: "스드메",
  title: "플래너 계약금",
  date: new Date("2026-11-08T00:00:00Z"),
  amount: 400_000,
  memo: null,
  done: false,
  doneAt: null,
  doneBy: null,
  createdAt: new Date("2026-11-01T00:00:00Z"),
  ...o,
});

test("결제 옮기기: 같은 이벤트·금액·이름의 지출 기록이 있으면 같은 돈으로 보고 결제는 버림 (80만 원 → 40만 원)", () => {
  const plan = planDueMerge([due({ id: "d1" })], [{ id: "x1", eventId: "e1", title: "플래너  계약금", amount: 400_000 }]);
  assert.deepEqual(plan.duplicate, [{ dueId: "d1", expenseId: "x1" }]);
  assert.equal(plan.create.length, 0);
});

test("결제 옮기기: 다른 돈은 결제·지출로 옮기고 상태·카테고리·낸 사람 유지", () => {
  const plan = planDueMerge(
    [
      due({ id: "d1", title: "잔금", amount: 1_600_000 }),
      due({ id: "d2", title: "계약금", amount: 200_000, done: true, doneAt: new Date("2026-10-01T00:00:00Z"), doneBy: "루빈" }),
      due({ id: "d3", title: "추가금", amount: null }),
      due({ id: "d4", title: "0원", amount: 0 }),
    ],
    [{ id: "x1", eventId: "e2", title: "잔금", amount: 1_600_000 }], // 다른 이벤트라 같은 돈 아님
  );
  assert.equal(plan.duplicate.length, 0);
  const byId = Object.fromEntries(plan.create.map((c) => [c.dueId, c.data]));
  assert.equal(byId.d1.paid, false);
  assert.equal(byId.d1.category, "스드메");
  assert.equal(byId.d2.paid, true);
  assert.equal(byId.d2.paidBy, "루빈");
  assert.equal(byId.d3.amount, null);
  assert.equal(byId.d4.amount, null);
});

test("결제 옮기기: 지출 기록 하나는 결제 하나와만 짝지음", () => {
  const plan = planDueMerge([due({ id: "d1" }), due({ id: "d2" })], [{ id: "x1", eventId: "e1", title: "플래너 계약금", amount: 400_000 }]);
  assert.equal(plan.duplicate.length, 1);
  assert.equal(plan.create.length, 1);
});
