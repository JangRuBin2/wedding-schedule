"use client";
import { useMemo, useState, useTransition } from "react";
import { addBudgetCategory, saveBudgetPlan } from "@/app/actions";
import { FALLBACK_CATEGORY } from "@/lib/meta";
import { allocate, MAX_TOTAL_MAN, MIN_TOTAL_MAN, movePct, recommendedPct, setAmount } from "@/lib/allocate";

type Cat = { id: string; name: string; color: string; budget: number };

/**
 * 예산 나누기 (작성 화면). 총예산(만 원)을 적고 카테고리마다 슬라이더로 비율을 정함.
 * 하나를 올리면 잠그지 않은 나머지가 비율대로 줄어서 합계는 늘 100%, 금액 합계는 늘 총예산과 같음.
 * 금액을 직접 적으면 그 칸이 고정됨(setAmount). 맨 아래에서 카테고리를 이름만 적어 바로 추가.
 * 총예산은 100만 원부터
 */
export function BudgetPlanner({ categories: initialCats }: { categories: Cat[] }) {
  const [categories, setCategories] = useState(initialCats);
  const names = categories.map((c) => c.name);
  const initialTotal = Math.round(initialCats.reduce((s, c) => s + c.budget, 0) / 10_000);
  const [total, setTotal] = useState(initialTotal);
  const [pct, setPct] = useState<number[]>(() =>
    initialTotal ? initialCats.map((c) => (c.budget / 10_000 / initialTotal) * 100) : recommendedPct(initialCats.map((c) => c.name)),
  );
  const [locked, setLocked] = useState<boolean[]>(() => initialCats.map(() => false));
  const [changed, setChanged] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [newName, setNewName] = useState("");
  const [adding, startAdding] = useTransition();

  const amounts = useMemo(() => allocate(total, pct), [total, pct]);
  const tooSmall = total > 0 && total < MIN_TOTAL_MAN;
  const tooBig = total > MAX_TOTAL_MAN;

  return (
    <div className="space-y-5">
      <div className="flex items-end gap-2">
        <label className="min-w-0 flex-1 space-y-1.5">
          <span className="label">총예산</span>
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
          추천 비율 적용
        </button>
      </div>
      {tooSmall && <p className="text-[13px] font-semibold text-spend">총예산은 {MIN_TOTAL_MAN}만 원 이상 입력해 주세요</p>}
      {tooBig && <p className="text-[13px] font-semibold text-spend">총예산은 최대 20억 원까지 입력할 수 있어요</p>}

      <ul className="space-y-4">
        {categories.map((c, i) => (
          <li key={c.id}>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} aria-hidden />
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{c.name}</span>
              <AmountInput
                label={`${c.name} 금액`}
                value={amounts[i]}
                onCommit={(man) => {
                  const r = setAmount(total, pct, locked, i, man);
                  setTotal(r.total);
                  setPct(r.pct);
                  setLocked(r.locked);
                  setChanged(true);
                }}
              />
            </div>
            <div className="flex items-center gap-2.5">
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
                className="range min-w-0 flex-1"
                style={{ "--c": c.color, "--p": `${pct[i]}%` } as React.CSSProperties}
              />
              <span className="num w-9 shrink-0 text-right text-[12px] text-sub">{Math.round(pct[i])}%</span>
              <button
                type="button"
                onClick={() => setLocked((prev) => prev.map((l, j) => (j === i ? !l : l)))}
                aria-pressed={locked[i]}
                className={`w-10 shrink-0 text-right text-[11px] font-semibold ${locked[i] ? "text-save" : "text-faint"}`}
                title="고정하면 다른 항목을 움직여도 바뀌지 않아요"
              >
                {locked[i] ? "고정됨" : "고정"}
              </button>
            </div>
          </li>
        ))}
      </ul>

      <form
        className="flex gap-2 border-t border-line pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          const name = newName.trim();
          if (!name || adding) return;
          startAdding(async () => {
            setError("");
            try {
              const cat = await addBudgetCategory(name);
              // '기타'는 늘 맨 끝이라 그 앞에 끼움 (서버 순서와 같게)
              const at = categories.findIndex((c) => c.name === FALLBACK_CATEGORY);
              const pos = at < 0 ? categories.length : at;
              const ins = <T,>(arr: T[], v: T) => [...arr.slice(0, pos), v, ...arr.slice(pos)];
              setCategories((prev) => ins(prev, cat));
              setPct((prev) => ins(prev, 0));
              setLocked((prev) => ins(prev, false));
              setNewName("");
            } catch (err) {
              setError(err instanceof Error ? err.message : "카테고리를 추가하지 못했어요");
            }
          });
        }}
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="새 카테고리 (예: 혼수)"
          maxLength={20}
          aria-label="새 카테고리 이름"
          className="input min-w-0 flex-1"
        />
        <button type="submit" disabled={!newName.trim() || adding} className="btn-ghost shrink-0 !bg-save-soft !py-[12px] !text-save disabled:opacity-50">
          {adding ? "추가 중…" : "+ 추가"}
        </button>
      </form>

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
        {pending ? "저장 중…" : !changed ? "변경 사항 없음" : "저장"}
      </button>
    </div>
  );
}

/**
 * 금액 직접 입력 (만 원). 적는 동안은 글자만 바꾸고, 칸을 벗어나거나 완료(엔터)를 누를 때 반영.
 * 칠 때마다 반영하면 '1'→'15'→'150' 사이에 다른 칸이 계속 출렁여서
 */
function AmountInput({ label, value, onCommit }: { label: string; value: number; onCommit: (man: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const n = Number(draft.replace(/[^\d]/g, ""));
    setDraft(null);
    if (Number.isFinite(n) && n !== value) onCommit(n);
  };
  return (
    <span className="relative block w-[124px] shrink-0">
      <input
        inputMode="numeric"
        enterKeyHint="done"
        aria-label={label}
        value={draft ?? value.toLocaleString("ko-KR")}
        onFocus={(e) => {
          setDraft(value ? String(value) : "");
          requestAnimationFrame(() => e.target.select());
        }}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, "").slice(0, 7))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        className="input num !py-2 pr-11 text-right text-[14px] font-bold"
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[12px] text-sub">만 원</span>
    </span>
  );
}
