import { test } from "node:test";
import assert from "node:assert/strict";
import { planExpenseGroups } from "./expense-groups";
import { splitTitle } from "./meta";

const at = (d: string) => new Date(`${d}T00:00:00Z`);
const e = (id: string, title: string, extra: Partial<{ coupleId: string; category: string; eventId: string | null }> = {}) => ({
  id,
  title,
  coupleId: extra.coupleId ?? "c1",
  category: extra.category ?? "스드메",
  eventId: extra.eventId ?? null,
  createdBy: null,
  createdAt: at("2026-11-01"),
});

test("splitTitle: 띄어 쓰거나 붙여 쓴 결제 이름을 떼고, 이름만 있으면 전액", () => {
  assert.deepEqual(splitTitle("헤어 메이크업 계약금"), { base: "헤어 메이크업", label: "계약금" });
  assert.deepEqual(splitTitle("스튜디오잔금"), { base: "스튜디오", label: "잔금" });
  assert.deepEqual(splitTitle("잔금"), { base: "잔금", label: "전액" });
  assert.deepEqual(splitTitle("식대"), { base: "식대", label: "전액" });
});

test("planExpenseGroups: 같은 커플·같은 항목 이름이면 한 항목, 제목은 띄어 맞춤", () => {
  const plan = planExpenseGroups([
    e("a", "스튜디오 계약금", { eventId: null }),
    e("b", "스튜디오잔금", { eventId: "ev1" }),
    e("c", "식대", { category: "예식" }),
    e("d", "스튜디오 계약금", { coupleId: "c2" }),
  ]);
  assert.equal(plan.length, 3);
  const studio = plan.find((g) => g.title === "스튜디오" && g.coupleId === "c1")!;
  assert.deepEqual(studio.expenses, [
    { id: "a", label: "계약금", title: "스튜디오 계약금" },
    { id: "b", label: "잔금", title: "스튜디오 잔금" },
  ]);
  assert.equal(studio.eventId, "ev1");
  assert.deepEqual(plan.find((g) => g.title === "식대")!.expenses, [{ id: "c", label: "전액", title: "식대" }]);
});
