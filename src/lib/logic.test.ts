import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, dateLabel, daysUntil, dueLabel, fromTime, fromYmd, fullDate, timeLabel, ymd } from "./dates";
import { budgetSummary, stackPct } from "./budget";
import { won } from "./money";
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

test("금액 표시", () => {
  assert.equal(won(300_000), "30만 원");
  assert.equal(won(1_234_500), "123.45만 원");
  assert.equal(won(655_000), "65.5만 원");
  assert.equal(won(5_000), "5,000원");
  assert.equal(won(410_550_000), "4억 1,055만 원");
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

test("예산 나누기: 합계가 늘 총예산과 같고, 100만 원 미만은 막음", async () => {
  const { allocate, movePct, recommendedPct, checkPlan } = await import("./allocate");
  // 예전 버그: 1만 원을 6칸에 나누면 반올림으로 합계가 넘었음
  const pct = recommendedPct(["예식", "스드메", "예물·예단", "신혼여행", "신혼집", "기타"]);
  assert.equal(Math.round(pct.reduce((a, b) => a + b, 0)), 100);
  for (const total of [1, 7, 100, 333, 5000, 12345]) {
    const a = allocate(total, pct);
    assert.equal(a.reduce((x, y) => x + y, 0), total, `total ${total}`);
    assert.ok(a.every((x) => Number.isInteger(x) && x >= 0));
  }
  assert.deepEqual(allocate(5000, pct), [2500, 400, 600, 500, 750, 250]);
  assert.deepEqual(allocate(0, pct), [0, 0, 0, 0, 0, 0]);
  assert.equal(checkPlan(allocate(1, pct)), "총예산은 100만 원 이상 입력해 주세요");
  assert.equal(checkPlan(allocate(100, pct)), null);
  assert.equal(checkPlan([50, 49.5]), "금액은 만 원 단위로 입력해 주세요");
  assert.equal(checkPlan([150000, 60000]), "총예산은 최대 20억 원까지 입력할 수 있어요");
  // 직접 만든 카테고리는 추천 0, 아는 이름이 없으면 똑같이
  assert.deepEqual(recommendedPct(["예식", "혼수"]), [100, 0]);
  assert.deepEqual(recommendedPct(["가", "나"]), [50, 50]);
  // 슬라이더: 잠근 칸 그대로, 합계 100
  const moved = movePct([50, 30, 20], 0, 70, [false, true, false]);
  assert.deepEqual(moved.map(Math.round), [70, 30, 0]);
  const moved2 = movePct([50, 30, 20], 0, 80, [false, false, false]);
  assert.deepEqual(moved2.map((x) => Math.round(x * 10) / 10), [80, 12, 8]);
  assert.deepEqual(movePct([50, 50], 0, 80, [false, true]), [50, 50]);
  assert.equal(Math.round(movePct([40, 30, 30], 1, 100, [true, false, false]).reduce((a, b) => a + b, 0)), 100);
});

test("만 원 단위 입력", async () => {
  const { parseMan, toManInput } = await import("./money");
  assert.equal(parseMan("30"), 300_000);
  assert.equal(parseMan("3.5"), 35_000);
  assert.equal(parseMan("1,200"), 12_000_000);
  assert.equal(parseMan("30만"), 300_000);
  assert.equal(parseMan("1억"), 100_000_000);
  assert.equal(parseMan(""), null);
  assert.equal(parseMan("abc"), null);
  assert.equal(parseMan("300000"), null); // 30억 → 범위 밖 (원으로 잘못 적은 경우를 걸러냄)
  assert.equal(toManInput(300_000), "30");
  assert.equal(toManInput(35_000), "3.5");
  assert.equal(toManInput(null), "");
});
