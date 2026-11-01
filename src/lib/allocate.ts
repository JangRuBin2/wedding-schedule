/**
 * 예산 나누기 계산 (예산 탭 '예산 나누기' 화면). DB 에 안 닿아서 클라이언트·서버·테스트에서 같이 씀.
 * 금액은 전부 만 원 단위 정수로 다룸
 */
export const MIN_TOTAL_MAN = 100; // 총예산은 100만 원부터
export const MAX_TOTAL_MAN = 200_000; // 20억 (DB 정수 범위 안)

/** 기본 카테고리 추천 비율(%). 모아봄과 같은 값 (신혼집은 혼수 몫 포함) */
const RECOMMENDED: Record<string, number> = { 예식: 50, 스드메: 8, "예물·예단": 12, 신혼여행: 10, 신혼집: 15, 기타: 5 };

/** 카테고리 목록에 맞춘 추천 비율. 직접 만든 카테고리는 0, 아는 이름이 하나도 없으면 똑같이 */
export function recommendedPct(names: string[]): number[] {
  const raw = names.map((n) => RECOMMENDED[n] ?? 0);
  const sum = raw.reduce((a, b) => a + b, 0);
  return sum > 0 ? raw.map((r) => (r / sum) * 100) : names.map(() => 100 / Math.max(1, names.length));
}

/**
 * 총예산(만 원)을 비율대로 나눔. 먼저 내림하고 남은 만 원을 소수점이 큰 순서로 하나씩 줘서
 * 합계가 항상 총예산과 정확히 같음 (예전 모아봄은 칸마다 반올림해서 합계가 총예산을 넘기도 했음)
 */
export function allocate(totalMan: number, pct: number[]): number[] {
  const total = Math.max(0, Math.floor(totalMan));
  const pSum = pct.reduce((a, b) => a + Math.max(0, b), 0);
  if (!total || !pSum) return pct.map(() => 0);
  // 1e-6 단위로 맞춰서 1500/4100*100 같은 비율이 1499.9999… 로 내려가 1만 원 어긋나지 않게
  const exact = pct.map((p) => Math.round(((total * Math.max(0, p)) / pSum) * 1e6) / 1e6);
  const out = exact.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = exact.map((e, i) => ({ i, frac: e - Math.floor(e) })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (!left) break;
    out[i]++;
    left--;
  }
  return out;
}

/**
 * 슬라이더 하나를 value(%)로 옮김. 잠근 칸은 그대로, 나머지 안 잠근 칸이 지금 비율대로 늘거나 줄어서 합계 100%.
 * 움직일 칸이 없으면(나머지가 다 잠김) 그대로
 */
export function movePct(pct: number[], index: number, value: number, locked: boolean[]): number[] {
  const free = pct.map((_, i) => i).filter((i) => i !== index && !locked[i]);
  if (!free.length) return pct;
  const lockedSum = pct.reduce((s, p, i) => (i !== index && locked[i] ? s + p : s), 0);
  const v = Math.max(0, Math.min(100 - lockedSum, value));
  const rest = 100 - lockedSum - v;
  const freeSum = free.reduce((s, i) => s + pct[i], 0);
  return pct.map((p, i) => (i === index ? v : locked[i] ? p : freeSum > 0 ? (p / freeSum) * rest : rest / free.length));
}

/** 저장 전에 서버에서 다시 확인. 문제가 있으면 이유를, 괜찮으면 null */
export function checkPlan(amountsMan: number[]): string | null {
  if (amountsMan.some((a) => !Number.isInteger(a) || a < 0)) return "금액은 만 원 단위로 입력해 주세요";
  const total = amountsMan.reduce((a, b) => a + b, 0);
  if (total < MIN_TOTAL_MAN) return `총예산은 ${MIN_TOTAL_MAN}만 원 이상 입력해 주세요`;
  if (total > MAX_TOTAL_MAN) return "총예산은 최대 20억 원까지 입력할 수 있어요";
  return null;
}

/**
 * 카테고리 하나에 금액(만 원)을 직접 적었을 때. 적은 칸은 고정되고,
 * - 총예산 안에서 맞출 수 있으면 슬라이더처럼 안 잠근 나머지가 비율대로 줄거나 늘어서 총예산은 그대로
 * - 넘치거나 움직일 칸이 없으면 다른 칸 금액은 그대로 두고 총예산을 합계로 바꿈
 */
export function setAmount(
  totalMan: number,
  pct: number[],
  locked: boolean[],
  index: number,
  man: number,
): { total: number; pct: number[]; locked: boolean[] } {
  const v = Math.max(0, Math.min(MAX_TOTAL_MAN, Math.floor(man)));
  const amounts = allocate(totalMan, pct);
  const lockedNext = locked.map((l, i) => (i === index ? true : l));
  const free = pct.map((_, i) => i).filter((i) => i !== index && !locked[i]);
  const lockedOthers = amounts.reduce((s, a, i) => (i !== index && locked[i] ? s + a : s), 0);
  if (totalMan > 0 && free.length && v <= totalMan - lockedOthers) {
    return { total: totalMan, pct: movePct(pct, index, (v / totalMan) * 100, locked), locked: lockedNext };
  }
  const next = amounts.map((a, i) => (i === index ? v : a));
  const total = next.reduce((a, b) => a + b, 0);
  return { total, pct: total ? next.map((a) => (a / total) * 100) : pct.map(() => 0), locked: lockedNext };
}
