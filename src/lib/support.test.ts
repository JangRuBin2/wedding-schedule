import assert from "node:assert/strict";
import { test } from "node:test";
import { shouldAskSupport, supportAnswer, SUPPORT_RULES } from "./support";

const now = new Date("2027-01-20T03:00:00Z");
const ago = (d: number) => new Date(now.getTime() - d * 86_400_000);
const active = { createdAt: ago(30), activeDays: 8, supportOptOut: false, supportSnooze: null };

test("후원 안내: 열심히 쓰는 사람에게만", () => {
  assert.equal(shouldAskSupport(active, 12, now), true);
  assert.equal(shouldAskSupport({ ...active, createdAt: ago(5) }, 12, now), false); // 가입 2주 전
  assert.equal(shouldAskSupport({ ...active, activeDays: 2 }, 12, now), false); // 쓴 날이 적음
  assert.equal(shouldAskSupport(active, 3, now), false); // 끝낸 일이 적음
});

test("후원 안내: 거절·미루기 존중", () => {
  assert.equal(shouldAskSupport({ ...active, supportOptOut: true }, 99, now), false);
  const later = supportAnswer("later", now).supportSnooze!;
  assert.equal(shouldAskSupport({ ...active, supportSnooze: later }, 99, now), false);
  assert.equal(shouldAskSupport({ ...active, supportSnooze: later }, 99, new Date(later.getTime() + 1000)), true);
  const after = supportAnswer("supported", now).supportSnooze!;
  assert.equal(Math.round((after.getTime() - now.getTime()) / 86_400_000), SUPPORT_RULES.afterSupportDays);
  assert.deepEqual(supportAnswer("never", now), { supportOptOut: true });
});
