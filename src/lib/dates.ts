/**
 * 날짜는 모두 한국 시간 기준 '하루'로 다룸. 서버가 UTC로 돌아도 같은 날짜가 나오게
 * 저장은 그날 09:00 KST(= 00:00 UTC)로 해서, 어느 시간대로 읽어도 날짜가 밀리지 않음
 */
const KST = 9 * 60 * 60 * 1000;
export const DAY = 24 * 60 * 60 * 1000;

/** Date → KST 기준 'YYYY-MM-DD' */
export function ymd(d: Date): string {
  return new Date(d.getTime() + KST).toISOString().slice(0, 10);
}

/** 'YYYY-MM-DD' (date input 값) → 저장할 Date. 형식이 틀리면 null */
export function fromYmd(v: unknown): Date | null {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T09:00:00+09:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 오늘(KST)부터 그날까지 남은 날 수. 오늘 0, 내일 1, 어제 -1 */
export function daysUntil(d: Date, now = new Date()): number {
  return Math.round((Date.parse(ymd(d)) - Date.parse(ymd(now))) / DAY);
}

/** 기준일에서 n일 뒤 (추천 일정 계산) */
export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY);
}

export const dueLabel = (days: number) => (days < 0 ? `${-days}일 지남` : days === 0 ? "오늘" : `D-${days}`);

/** 올해면 '11월 15일', 다른 해면 '2027년 8월 21일' */
export function dateLabel(d: Date, now = new Date()): string {
  const [y, m, day] = ymd(d).split("-").map(Number);
  const md = `${m}월 ${day}일`;
  return y === Number(ymd(now).slice(0, 4)) ? md : `${y}년 ${md}`;
}

/** '3/14' */
export function shortDate(d: Date): string {
  const [, m, day] = ymd(d).split("-").map(Number);
  return `${m}/${day}`;
}
