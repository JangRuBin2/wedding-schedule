"use client";
import { useMemo, useState, useTransition } from "react";
import { saveBudgetPlan } from "@/app/actions";
import { allocate, MAX_TOTAL_MAN, MIN_TOTAL_MAN, movePct, recommendedPct } from "@/lib/allocate";

type Cat = { id: string; name: string; color: string; budget: number };

/**
 * 예산 나누기 (작성 화면). 총예산(만 원)을 적고 카테고리마다 슬라이더로 비율을 정함.
 * 하나를 올리면 잠그지 않은 나머지가 비율대로 줄어서 합계는 늘 100%, 금액 합계는 늘 총예산과 같음.
 * 총예산은 100만 원부터
 */
export function BudgetPlanner({ categories }: { categories: Cat[] }) {
  const names = categories.map((c) => c.name);
  const initialTotal = Math.round(categories.reduce((s, c) => s + c.budget, 0) / 10_000);
  const [total, setTotal] = useState(initialTotal);
  const [pct, setPct] = useState<number[]>(() =>
    initialTotal ? categories.map((c) => (c.budget / 10_000 / initialTotal) * 100) : recommendedPct(names),
  );
  const [locked, setLocked] = useState<boolean[]>(() => categories.map(() => false));
  const [changed, setChanged] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const amounts = useMemo(() => allocate(total, pct), [total, pct]);
  const tooSmall = total > 0 && total < MIN_TOTAL_MAN;
  const tooBig = total > MAX_TOTAL_MAN;

  return (
    <div className="space-y-5">
      <div className="flex items-end gap-2">
        <label className="min-w-0 flex-1 space-y-1.5">
          <span className="label">총예산 (만 원)</span>
          <span className="relative block">
            <input
              inputMode="numeric"
              value={total ? total.toLocaleString("ko-KR") : ""}
              placeholder="예: 5,000"
              onChange={(e) => {
                setTotal(Math.min(MAX_TOTAL_MAN * 10, Number(e.target.value.replace(/[^\d]/g, "")) || 0));
                setChanged(true);
              }}
              aria-invalid={tooSmall || tooBig}
              className="input num pr-14 text-[17px] font-bold"
            />
            <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[14px] text-sub">만 원</span>
          </span>
        </label>
        <button
          type="button"
          className="btn-ghost !bg-save-soft !py-[12px] !text-save"
          onClick={() => {
            setPct(recommendedPct(names));
            setLocked(categories.map(() => false));
            setChanged(true);
          }}
        >
          추천 비율로
        </button>
      </div>
      {tooSmall && <p className="text-[13px] font-semibold text-spend">총예산은 {MIN_TOTAL_MAN}만 원부터 정할 수 있어요</p>}
      {tooBig && <p className="text-[13px] font-semibold text-spend">총예산은 20억 원(200,000만 원)까지 정할 수 있어요</p>}

      <ul className="space-y-4">
        {categories.map((c, i) => (
          <li key={c.id}>
            <div className="mb-1.5 flex items-baseline gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} aria-hidden />
              <span className="min-w-0 truncate text-[14px] font-semibold">{c.name}</span>
              <button
                type="button"
                onClick={() => setLocked((prev) => prev.map((l, j) => (j === i ? !l : l)))}
                aria-pressed={locked[i]}
                className={`text-[11px] font-semibold ${locked[i] ? "text-save" : "text-faint"}`}
                title="잠그면 다른 슬라이더를 움직여도 그대로예요"
              >
                {locked[i] ? "잠김" : "잠금"}
              </button>
              <span className="num ml-auto text-[14px] font-bold">{amounts[i].toLocaleString("ko-KR")}만 원</span>
              <span className="num w-10 text-right text-[12px] text-sub">{Math.round(pct[i])}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(pct[i])}
              disabled={locked[i]}
              onChange={(e) => {
                setPct((prev) => movePct(prev, i, Number(e.target.value), locked));
                setChanged(true);
              }}
              aria-label={`${c.name} 비율`}
              className="range"
              style={{ "--c": c.color, "--p": `${pct[i]}%` } as React.CSSProperties}
            />
          </li>
        ))}
      </ul>

      {error && <p className="text-[13px] font-semibold text-spend">{error}</p>}
      <button
        type="button"
        className="btn w-full disabled:opacity-50"
        disabled={pending || !changed || total < MIN_TOTAL_MAN || tooBig}
        onClick={() =>
          start(async () => {
            setError("");
            try {
              await saveBudgetPlan(categories.map((c, i) => ({ id: c.id, man: amounts[i] })));
            } catch (e) {
              if (e instanceof Error && !e.message.includes("NEXT_REDIRECT")) setError(e.message);
              else throw e;
            }
          })
        }
      >
        {pending ? "저장하는 중…" : !changed ? "바꾼 게 없어요" : "이대로 나누기"}
      </button>
    </div>
  );
}
