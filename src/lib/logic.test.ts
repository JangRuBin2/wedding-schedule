import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, dateLabel, daysUntil, dueLabel, fromTime, fromYmd, fullDate, timeLabel, ymd } from "./dates";
import { budgetSummary, stackPct } from "./budget";
import { parseWon, won } from "./money";
import { scheduleItems, upcoming } from "./upcoming";
import { EVENT_TEMPLATES, SUGGESTED_TASKS, suggestionsFor, templateOffset } from "./templates";
import { colorOf, DEFAULT_CATEGORIES, FALLBACK_CATEGORY } from "./meta";

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
  const names = DEFAULT_CATEGORIES.map((c) => c.name as string);
  for (const t of EVENT_TEMPLATES) assert.ok(names.includes(t.category), t.title);
  assert.ok(names.includes(FALLBACK_CATEGORY));
  const keys = new Set(EVENT_TEMPLATES.map((t) => t.key));
  for (const s of SUGGESTED_TASKS) assert.ok(keys.has(s.eventKey), s.content);
});

test("추천 할 일: 이미 있는 건 빼고", () => {
  const all = suggestionsFor("s09");
  assert.equal(all.length, 4);
  assert.equal(suggestionsFor("s09", [{ content: "장소 예약" }]).length, 3);
  assert.deepEqual(suggestionsFor(null), []);
});

test("카테고리 색: 목록에 없는 이름(지워진 카테고리)은 회색", () => {
  const cats = [{ name: "혼수", color: "#e5544b" }];
  assert.equal(colorOf(cats, "혼수"), "#e5544b");
  assert.equal(colorOf(cats, "없음"), "#b3a9a6");
});

test("곧 할 일: 밀린 것 먼저, 30일 안만, 끝난 건 빼고, 같은 날은 이벤트→할 일→결제", () => {
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

test("예산: 냈어요는 낸 돈, 아직은 낼 돈, 금액 없는 결제는 빼고, 초과 계산", () => {
  const s = budgetSummary(
    [
      { name: "예식", color: "#000", budget: 1_000_000 },
      { name: "기타", color: "#111", budget: 0 },
    ],
    [
      { category: "예식", amount: 700_000, done: true },
      { category: "예식", amount: 500_000, done: false },
      { category: "예식", amount: null, done: false },
      { category: "기타", amount: 30_000, done: true },
      { category: "지워짐", amount: 10_000, done: false },
    ],
  );
  assert.deepEqual(
    s.rows.map((r) => [r.name, r.paid, r.planned, r.over]),
    [
      ["예식", 700_000, 500_000, 200_000],
      ["기타", 30_000, 0, 0],
    ],
  );
  assert.equal(s.total, 1_000_000);
  assert.equal(s.paid, 730_000);
  assert.equal(s.planned, 510_000);
  assert.equal(s.left, -240_000);
});

test("금액 입력과 표시", () => {
  assert.equal(parseWon("300,000"), 300_000);
  assert.equal(parseWon("30만"), 300_000);
  assert.equal(parseWon("1.5억"), 150_000_000);
  assert.equal(parseWon("30만원"), 300_000);
  assert.equal(parseWon(""), null);
  assert.equal(parseWon("abc"), null);
  assert.equal(won(300_000), "30만 원");
  assert.equal(won(1_234_500), "1,234,500원");
  assert.equal(won(150_000_000), "1억 5,000만 원");
  assert.equal(won(200_000_000), "2억 원");
});

test("시간 표시", () => {
  assert.equal(timeLabel("10:00", "12:00"), "오전 10:00 - 오후 12:00");
  assert.equal(timeLabel("13:30", null), "오후 1:30");
  assert.equal(timeLabel(null, "12:00"), undefined);
  assert.equal(fromTime("25:00"), null);
  assert.equal(fromTime("09:05"), "09:05");
  assert.equal(fullDate(fromYmd("2026-07-01")!), "2026. 7. 01 (수)");
});

test("예산 막대: 낸 돈 + 낼 돈이 100%를 넘지 않음", () => {
  assert.deepEqual(stackPct(30, 120, 300), [10, 40]);
  assert.deepEqual(stackPct(250, 100, 300).map(Math.round), [83, 17]);
  assert.deepEqual(stackPct(400, 100, 300), [100, 0]);
  assert.deepEqual(stackPct(10, 10, 0), [0, 0]);
});
