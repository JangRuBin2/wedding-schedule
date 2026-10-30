import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, dateLabel, daysUntil, dueLabel, fromYmd, ymd } from "./dates";
import { scheduleItems, upcoming } from "./upcoming";
import { EVENT_TEMPLATES, SUGGESTED_TASKS, suggestionsFor, templateOffset } from "./templates";
import { CATEGORY_NAMES, toCategory } from "./meta";

test("날짜 입력값은 KST 그날로 저장되고 같은 날짜로 읽힘", () => {
  const d = fromYmd("2027-03-14")!;
  assert.equal(ymd(d), "2027-03-14");
  assert.equal(fromYmd("2027-3-14"), null);
  assert.equal(fromYmd(""), null);
  assert.equal(fromYmd(null), null);
});

test("남은 날은 KST 달력 기준 (자정 직전·직후)", () => {
  const due = fromYmd("2026-11-01")!;
  // 10월 31일 23:30 KST = 14:30 UTC → 내일
  assert.equal(daysUntil(due, new Date("2026-10-31T14:30:00Z")), 1);
  // 11월 1일 00:10 KST = 10월 31일 15:10 UTC → 오늘
  assert.equal(daysUntil(due, new Date("2026-10-31T15:10:00Z")), 0);
  assert.equal(daysUntil(due, new Date("2026-11-03T03:00:00Z")), -2);
});

test("라벨", () => {
  assert.equal(dueLabel(0), "오늘");
  assert.equal(dueLabel(5), "D-5");
  assert.equal(dueLabel(-3), "3일 지남");
  const now = new Date("2026-10-30T03:00:00Z");
  assert.equal(dateLabel(fromYmd("2026-11-15")!, now), "11월 15일");
  assert.equal(dateLabel(fromYmd("2027-08-21")!, now), "2027년 8월 21일");
});

test("추천 일정: 결혼식 날짜 + offset", () => {
  const wedding = fromYmd("2027-05-15")!;
  assert.equal(ymd(addDays(wedding, templateOffset("s18")!)), "2027-05-15");
  assert.equal(ymd(addDays(wedding, templateOffset("s17")!)), "2027-05-01");
  assert.equal(ymd(addDays(wedding, templateOffset("s01")!)), "2026-05-15");
  assert.equal(templateOffset(null), undefined);
});

test("기본 이벤트 20개, 키 중복 없음, 카테고리는 목록 안", () => {
  assert.equal(EVENT_TEMPLATES.length, 20);
  assert.equal(new Set(EVENT_TEMPLATES.map((t) => t.key)).size, 20);
  for (const t of EVENT_TEMPLATES) assert.ok(CATEGORY_NAMES.includes(t.category), t.title);
  const keys = new Set(EVENT_TEMPLATES.map((t) => t.key));
  for (const s of SUGGESTED_TASKS) assert.ok(keys.has(s.eventKey), s.content);
});

test("추천 할 일: 이미 있는 건 빼고", () => {
  const all = suggestionsFor("s09");
  assert.equal(all.length, 4);
  assert.equal(suggestionsFor("s09", [{ content: "장소 예약" }]).length, 3);
  assert.deepEqual(suggestionsFor(null), []);
});

test("카테고리는 모르는 값이면 기타", () => {
  assert.equal(toCategory("스드메"), "스드메");
  assert.equal(toCategory("해킹"), "기타");
  assert.equal(toCategory(null), "기타");
});

test("곧 할 일: 밀린 것 먼저, 30일 안만, 끝난 건 빼고, 같은 날은 이벤트→할 일→돈 낼 날", () => {
  const now = new Date("2026-10-30T03:00:00Z");
  const d = (s: string) => fromYmd(s)!;
  const items = scheduleItems([
    {
      id: "e1",
      title: "웨딩홀 계약",
      category: "예식",
      date: d("2026-11-05"),
      done: false,
      tasks: [
        { id: "t1", content: "견적 비교", date: d("2026-10-25"), done: false },
        { id: "t2", content: "날짜 없음", date: null, done: false },
        { id: "t3", content: "끝남", date: d("2026-11-01"), done: true },
      ],
      dues: [
        { id: "d1", title: "계약금", date: d("2026-11-05"), done: false },
        { id: "d2", title: "잔금", date: d("2027-05-01"), done: false },
      ],
    },
    { id: "e2", title: "날짜 미정", category: "기타", date: null, done: false, tasks: [], dues: [] },
  ]);
  // 날짜 있는 것만: e1, t1, t3, d1, d2
  assert.equal(items.length, 5);
  const soon = upcoming(items, now);
  assert.deepEqual(
    soon.map((i) => `${i.kind}:${i.id}:${i.days}`),
    ["task:t1:-5", "event:e1:6", "due:d1:6"],
  );
  assert.equal(soon[0].eventTitle, "웨딩홀 계약");
});
