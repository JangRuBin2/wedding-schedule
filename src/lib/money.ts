/**
 * 금액 표시. 입력과 같은 만 원 단위로: '30만 원', '65.5만 원', '1억 5,000만 원'. 1만 원 미만만 '5,000원'
 */
export function won(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs < 10_000) return `${sign}${abs.toLocaleString("ko-KR")}원`;
  const man = abs / 10_000;
  if (Number.isInteger(man) && man >= 10_000) {
    const eok = Math.floor(man / 10_000);
    const rest = man % 10_000;
    return `${sign}${eok}억${rest ? ` ${rest.toLocaleString("ko-KR")}만` : ""} 원`;
  }
  return `${sign}${man.toLocaleString("ko-KR", { maximumFractionDigits: 4 })}만 원`;
}

/**
 * 만 원 단위 입력 → 원. '30' = 30만 원, '3.5' = 3만 5천 원, '1,200' = 1,200만 원, '1억' = 1억 원도 받음.
 * 비었거나 잘못되면 null
 */
export function parseMan(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/[,\s원]/g, "").replace(/만$/, "");
  if (!s) return null;
  const m = s.match(/^(\d+(?:\.\d{1,4})?)(억)?$/);
  if (!m) return null;
  const n = Number(m[1]) * (m[2] ? 100_000_000 : 10_000);
  return Number.isFinite(n) && n >= 0 && n <= 2_000_000_000 ? Math.round(n) : null;
}

/** 원 → 만 원 입력칸에 넣을 값 ('300000' → '30', '35000' → '3.5') */
export const toManInput = (won: number | null | undefined) => (won ? String(Math.round((won / 10_000) * 10_000) / 10_000) : "");
