import { won } from "@/lib/money";

type Row = { name: string; color: string; paid: number; planned: number };

/**
 * 휴대폰 저장공간 막대처럼: 총예산 폭 위에 카테고리별로 낸 돈(진한 색)·낼 돈(빗금)을 이어 붙이고 나머지는 남은 예산.
 * 총예산을 넘으면 막대 기준이 '쓴 돈 합계'로 바뀜 (모아봄 예산 탭과 같은 모양)
 */
export function UsageBar({ rows, total }: { rows: Row[]; total: number }) {
  const used = rows.reduce((s, r) => s + r.paid + r.planned, 0);
  const base = Math.max(total, used, 1);
  const shown = rows.filter((r) => r.paid || r.planned);
  return (
    <div>
      <div className="flex h-4 gap-[2px] overflow-hidden rounded-full bg-card" role="img" aria-label={`예산 ${won(total)} 중 ${won(used)} 사용`}>
        {shown.map((r) => (
          <span key={r.name} className="flex h-full" style={{ width: `${((r.paid + r.planned) / base) * 100}%` }}>
            {r.paid > 0 && <span className="h-full" style={{ flex: r.paid, background: r.color }} />}
            {r.planned > 0 && (
              <span
                className="h-full"
                style={{
                  flex: r.planned,
                  background: `repeating-linear-gradient(135deg, ${r.color} 0 4px, color-mix(in srgb, ${r.color} 35%, transparent) 4px 8px)`,
                }}
              />
            )}
          </span>
        ))}
      </div>
      {shown.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-sub">
          {shown.map((r) => (
            <li key={r.name} className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: r.color }} aria-hidden />
              {r.name}
            </li>
          ))}
          <li className="text-faint">빗금: 결제 예정</li>
        </ul>
      )}
    </div>
  );
}
