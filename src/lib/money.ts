/** 금액 표시. 만 원 단위로 떨어지면 '30만 원', 아니면 '1,234,500원' */
export function won(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 10_000 && abs % 10_000 === 0) {
    const man = abs / 10_000;
    if (man >= 10_000) {
      const eok = Math.floor(man / 10_000);
      const rest = man % 10_000;
      return `${sign}${eok}억${rest ? ` ${rest.toLocaleString("ko-KR")}만` : ""} 원`;
    }
    return `${sign}${man.toLocaleString("ko-KR")}만 원`;
  }
  return `${sign}${abs.toLocaleString("ko-KR")}원`;
}

/** 폼 금액 → 원. '30만', '300,000', '300000' 다 받음. 비었거나 잘못되면 null */
export function parseWon(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/[,\s원]/g, "");
  if (!s) return null;
  const m = s.match(/^(\d+(?:\.\d+)?)(억|만)?$/);
  if (!m) return null;
  const n = Number(m[1]) * (m[2] === "억" ? 100_000_000 : m[2] === "만" ? 10_000 : 1);
  return Number.isFinite(n) && n >= 0 && n <= 10_000_000_000 ? Math.round(n) : null;
}
