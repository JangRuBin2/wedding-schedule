"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toggleDue, toggleEvent, toggleTask } from "@/app/actions";
import { KINDS, type CategoryInfo, type Kind } from "@/lib/meta";
import { LinkPending } from "./LinkPending";
import { OptimisticCheck } from "./OptimisticCheck";

export type CalItem = {
  key: string;
  /** 이벤트·할 일·결제의 id (체크할 때 씀) */
  id: string;
  /** KST 기준 YYYY-MM-DD */
  ymd: string;
  kind: Kind;
  label: string;
  category: string;
  /** 할 일·결제가 속한 이벤트 이름 */
  eventTitle: string;
  /** '오전 10:00 - 오후 12:00' (없으면 하루 종일) */
  time?: string;
  place?: string;
  /** 결제 금액 표시 ('30만 원') */
  amount?: string;
  href: string;
  done?: boolean;
};

const WEEK = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const WEEK_KO = ["일", "월", "화", "수", "목", "금", "토"];
const KIND_ORDER = { event: 0, task: 1, due: 2 } as const;
const TOGGLE = { event: toggleEvent, task: toggleTask, due: toggleDue } as const;
const pad = (n: number) => String(n).padStart(2, "0");
const sortItems = (a: CalItem, b: CalItem) => a.ymd.localeCompare(b.ymd) || KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
const weekday = (ymd: string) => WEEK_KO[new Date(`${ymd}T00:00:00Z`).getUTCDay()];

/**
 * 홈 캘린더. 칸의 막대·리스트 색은 종류(이벤트·할 일·결제)로 구분하고, 카테고리는 선택 상자로 거름.
 * 날짜를 누르면 바로 아래에 그날 일정과 '+ 추가'(그 날짜로 작성 화면을 엶)가 나옴. 달 넘기기·고르기는 화면 안에서만
 */
export function Calendar({
  items,
  today,
  initial,
  categories,
}: {
  items: CalItem[];
  today: string;
  /** 처음 고른 날짜 (작성 화면에서 돌아올 때 ?date=) */
  initial?: string;
  categories: CategoryInfo[];
}) {
  const start = initial ?? today;
  const [sy, sm] = start.split("-").map(Number);
  const [view, setView] = useState({ y: sy, m: sm - 1 });
  const [selected, setSelected] = useState<string>(start);
  const [cat, setCat] = useState("");

  const shown = useMemo(() => (cat ? items.filter((i) => i.category === cat) : items), [items, cat]);
  const byDay = useMemo(() => {
    const map = new Map<string, CalItem[]>();
    for (const it of shown) map.set(it.ymd, [...(map.get(it.ymd) ?? []), it]);
    for (const list of map.values()) list.sort(sortItems);
    return map;
  }, [shown]);

  const prefix = `${view.y}-${pad(view.m + 1)}`;
  const first = new Date(Date.UTC(view.y, view.m, 1)).getUTCDay();
  const days = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  const move = (delta: number) => {
    const d = new Date(Date.UTC(view.y, view.m + delta, 1));
    const next = { y: d.getUTCFullYear(), m: d.getUTCMonth() };
    setView(next);
    // 이번 달이면 오늘, 아니면 그 달 첫 일정 날짜(없으면 1일)
    const p = `${next.y}-${pad(next.m + 1)}`;
    const firstDay = [...byDay.keys()].filter((k) => k.startsWith(p)).sort()[0];
    setSelected(today.startsWith(p) ? today : (firstDay ?? `${p}-01`));
  };

  const dayItems = byDay.get(selected) ?? [];
  const monthItems = shown.filter((i) => i.ymd.startsWith(prefix)).sort(sortItems);
  const [, selM, selD] = selected.split("-").map(Number);

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between px-1">
        <button type="button" onClick={() => move(-1)} aria-label="이전 달" className="p-2 text-[22px] leading-none text-sub">‹</button>
        <button
          type="button"
          onClick={() => {
            setView({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 });
            setSelected(today);
          }}
          title="오늘로"
          className="num text-[19px] font-semibold"
        >
          {view.y}년 {view.m + 1}월
        </button>
        <button type="button" onClick={() => move(1)} aria-label="다음 달" className="p-2 text-[22px] leading-none text-sub">›</button>
      </div>

      <div>
        <div className="grid grid-cols-7 pb-2 text-center text-[10px] font-medium tracking-wide text-sub">
          {WEEK.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (d == null) return <span key={`b${i}`} className="h-[62px] rounded-xl border border-line/60" />;
            const key = `${prefix}-${pad(d)}`;
            const list = byDay.get(key) ?? [];
            const isToday = key === today;
            const isSel = key === selected;
            return (
              <button
                type="button"
                key={key}
                onClick={() => setSelected(key)}
                aria-pressed={isSel}
                aria-label={`${view.m + 1}월 ${d}일${list.length ? `, 일정 ${list.length}개` : ""}`}
                className={`flex h-[62px] flex-col gap-1 rounded-xl border px-1.5 pt-1.5 text-left transition-colors ${
                  isSel ? "border-save bg-blush" : "border-line bg-card"
                }`}
              >
                <span
                  className={`num flex h-5 min-w-5 items-center justify-center self-start rounded-full px-1 text-[12px] ${
                    isToday ? "bg-save font-bold text-on-save" : i % 7 === 0 ? "text-spend" : ""
                  }`}
                >
                  {d}
                </span>
                <span className="flex w-full flex-col gap-[3px]">
                  {list.slice(0, 3).map((it) => (
                    <span key={it.key} className="h-[4px] w-full rounded-full" style={{ background: KINDS[it.kind].color, opacity: it.done ? 0.3 : 1 }} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
        <ul className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[12px] text-sub">
          {(Object.keys(KINDS) as Kind[]).map((k) => (
            <li key={k} className="flex items-center gap-1.5">
              <span className="h-[4px] w-3.5 rounded-full" style={{ background: KINDS[k].color }} aria-hidden />
              {KINDS[k].label}
            </li>
          ))}
          <li className="ml-auto">
            <label className="flex items-center gap-2">
              <span className="sr-only">카테고리</span>
              <select value={cat} onChange={(e) => setCat(e.target.value)} className="select">
                <option value="">카테고리 전체</option>
                {categories.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </li>
        </ul>
      </div>

      {/* 고른 날: 그날 일정 + 그 날짜로 추가 (무엇을 추가할지는 작성 화면에서 고름) */}
      <div className="card space-y-3 !p-4">
        <h2 className="flex items-baseline justify-between gap-2">
          <span className="text-[16px] font-bold">
            {selM}월 {selD}일 ({weekday(selected)})
          </span>
          <span className="text-[12px] text-sub">{dayItems.length ? `일정 ${dayItems.length}개` : "일정 없음"}</span>
        </h2>
        <Link href={`/new?date=${selected}`} className="btn relative block w-full !py-2.5 text-center">
          + 추가
          <LinkPending className="rounded-[14px]" />
        </Link>
        {dayItems.length > 0 && (
          <ul className="space-y-2">
            {dayItems.map((it) => (
              <ItemRow key={it.key} it={it} compact />
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="section-title">
          {view.m + 1}월 일정
          <small>{monthItems.length ? `${monthItems.length}개` : ""}</small>
        </h2>
        <ul className="space-y-2.5">
          {monthItems.map((it) => (
            <ItemRow key={it.key} it={it} />
          ))}
          {monthItems.length === 0 && <li className="card py-8 text-center text-[13px] text-sub">{view.m + 1}월에는 일정이 없어요</li>}
        </ul>
      </div>
    </section>
  );
}

function ItemRow({ it, compact = false }: { it: CalItem; compact?: boolean }) {
  const [, m, d] = it.ymd.split("-").map(Number);
  const k = KINDS[it.kind];
  return (
    <li
      className={`flex items-center gap-3 ${compact ? "rounded-xl p-2.5" : "card !p-3"}`}
      style={compact ? { background: `color-mix(in srgb, ${k.color} 7%, transparent)` } : undefined}
    >
      <Link href={it.href} className="flex min-w-0 flex-1 items-center gap-3">
        {compact ? (
          <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: k.color, opacity: it.done ? 0.35 : 1 }} aria-hidden />
        ) : (
          <span
            className="flex h-[58px] w-[52px] shrink-0 flex-col items-center justify-center rounded-xl"
            style={{ background: `color-mix(in srgb, ${k.color} ${it.done ? 7 : 14}%, transparent)`, color: k.color }}
          >
            <span className="num text-[15px] font-semibold">
              {m}.{pad(d)}
            </span>
            <span className="text-[11px]">({weekday(it.ymd)})</span>
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[15px] font-semibold ${it.done ? "text-sub line-through" : ""}`}>{it.label}</span>
          <span className="block truncate text-[12px] text-sub">
            {it.category}
            {it.kind !== "event" && ` · ${it.eventTitle}`}
            {it.amount && ` · ${it.amount}`}
            {it.place && ` · ${it.place}`}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="pill" style={{ "--k": k.color } as React.CSSProperties}>
            {k.label}
          </span>
          {it.time && <span className="num text-[11px] text-sub">{it.time}</span>}
        </span>
      </Link>
      <OptimisticCheck done={!!it.done} action={TOGGLE[it.kind].bind(null, it.id)} label={it.label} />
    </li>
  );
}
