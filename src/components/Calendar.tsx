"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toggleDue, toggleEvent, toggleTask } from "@/app/actions";
import { soft, type CategoryInfo } from "@/lib/meta";
import { LinkPending } from "./LinkPending";
import { OptimisticCheck } from "./OptimisticCheck";

export type CalItem = {
  key: string;
  /** 이벤트·할 일·결제의 id (체크할 때 씀) */
  id: string;
  /** KST 기준 YYYY-MM-DD */
  ymd: string;
  kind: "event" | "task" | "due";
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
  color: string;
  done?: boolean;
};

const WEEK = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const WEEK_KO = ["일", "월", "화", "수", "목", "금", "토"];
const KIND_ORDER = { event: 0, task: 1, due: 2 } as const;
const KIND_LABEL = { event: "일정", task: "할 일", due: "결제" } as const;
const TOGGLE = { event: toggleEvent, task: toggleTask, due: toggleDue } as const;
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * 홈 캘린더 + 일정 리스트. 달 넘기기·날짜 고르기·카테고리 고르기는 화면 안에서만 바뀜(서버에 다시 묻지 않음).
 * 날짜를 고르면 그날 일정만, 안 고르면 그 달 일정 전체. 체크는 바로 저장
 */
export function Calendar({ items, today, categories }: { items: CalItem[]; today: string; categories: CategoryInfo[] }) {
  const [ty, tm] = today.split("-").map(Number);
  const [view, setView] = useState({ y: ty, m: tm - 1 });
  const [selected, setSelected] = useState<string | null>(null);
  const [cat, setCat] = useState<string | null>(null);

  const shown = useMemo(() => (cat ? items.filter((i) => i.category === cat) : items), [items, cat]);
  const byDay = useMemo(() => {
    const map = new Map<string, CalItem[]>();
    for (const it of shown) map.set(it.ymd, [...(map.get(it.ymd) ?? []), it]);
    for (const list of map.values()) list.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
    return map;
  }, [shown]);

  const prefix = `${view.y}-${pad(view.m + 1)}`;
  const first = new Date(Date.UTC(view.y, view.m, 1)).getUTCDay();
  const days = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  const move = (delta: number) => {
    const d = new Date(Date.UTC(view.y, view.m + delta, 1));
    setView({ y: d.getUTCFullYear(), m: d.getUTCMonth() });
    setSelected(null);
  };

  const list = selected
    ? (byDay.get(selected) ?? [])
    : shown.filter((i) => i.ymd.startsWith(prefix)).sort((a, b) => a.ymd.localeCompare(b.ymd) || KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
  const [, sm, sd] = (selected ?? "").split("-").map(Number);

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between px-1">
        <button type="button" onClick={() => move(-1)} aria-label="이전 달" className="p-2 text-[22px] leading-none text-sub">‹</button>
        <button
          type="button"
          onClick={() => {
            setView({ y: ty, m: tm - 1 });
            setSelected(null);
          }}
          title="이번 달로"
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
            const dayItems = byDay.get(key) ?? [];
            const event = dayItems.find((it) => it.kind === "event");
            const isToday = key === today;
            const isSel = key === selected;
            return (
              <button
                type="button"
                key={key}
                onClick={() => setSelected(isSel ? null : key)}
                aria-pressed={isSel}
                aria-label={`${view.m + 1}월 ${d}일${dayItems.length ? `, 일정 ${dayItems.length}개` : ""}`}
                className={`flex h-[62px] flex-col gap-1 rounded-xl border px-1.5 pt-1.5 text-left transition-colors ${
                  isSel ? "border-save ring-1 ring-save" : "border-line"
                }`}
                style={{ background: event ? soft(event.color, event.done ? 0.12 : 0.26) : "var(--color-card)" }}
              >
                <span
                  className={`num flex h-5 min-w-5 items-center justify-center self-start rounded-full px-1 text-[12px] ${
                    isToday ? "bg-save font-bold text-on-save" : i % 7 === 0 ? "text-spend" : ""
                  }`}
                >
                  {d}
                </span>
                <span className="flex w-full flex-col gap-[3px]">
                  {dayItems.slice(0, 3).map((it) => (
                    <span key={it.key} className="h-[3px] w-full rounded-full" style={{ background: it.color, opacity: it.done ? 0.35 : 1 }} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="카테고리">
        <CatChip active={!cat} onClick={() => setCat(null)}>
          전체
        </CatChip>
        {categories.map((c) => (
          <CatChip key={c.name} active={cat === c.name} onClick={() => setCat(cat === c.name ? null : c.name)}>
            <span className="h-2 w-2 rounded-full" style={{ background: c.color }} aria-hidden />
            {c.name}
          </CatChip>
        ))}
      </div>

      <div>
        <h2 className="section-title">
          {selected ? `${sm}월 ${sd}일` : "이벤트 리스트"}
          <span className="flex items-center gap-3">
            {selected && (
              <button type="button" onClick={() => setSelected(null)} className="text-[12px] font-medium text-sub">
                {view.m + 1}월 전체 ›
              </button>
            )}
            <Link href={`/events/new${selected ? `?date=${selected}` : ""}`} className="relative text-[12px] font-semibold text-save">
              + {selected ? "이날 " : ""}이벤트
              <LinkPending />
            </Link>
          </span>
        </h2>
        <ul className="space-y-2.5">
          {list.map((it) => (
            <ItemRow key={it.key} it={it} />
          ))}
          {list.length === 0 && (
            <li className="card py-8 text-center text-[13px] text-sub">{selected ? "이날은 일정이 없어요" : `${view.m + 1}월에는 일정이 없어요`}</li>
          )}
        </ul>
      </div>
    </section>
  );
}

function ItemRow({ it }: { it: CalItem }) {
  const [, m, d] = it.ymd.split("-").map(Number);
  const wd = WEEK_KO[new Date(`${it.ymd}T00:00:00Z`).getUTCDay()];
  return (
    <li className="card flex items-center gap-3 !p-3">
      <Link href={it.href} className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className="flex h-[60px] w-[54px] shrink-0 flex-col items-center justify-center rounded-xl"
          style={{ background: soft(it.color, it.done ? 0.12 : 0.28) }}
        >
          <span className="num text-[16px] font-medium">
            {m}.{pad(d)}
          </span>
          <span className="text-[11px] text-sub">({wd})</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[15px] font-semibold ${it.done ? "text-sub line-through" : ""}`}>{it.label}</span>
          <span className="block truncate text-[12px] text-sub">
            {it.category}
            {it.kind !== "event" && ` / ${it.eventTitle}`}
          </span>
          {(it.place || it.amount) && (
            <span className="block truncate text-[12px] text-sub">
              {it.amount ?? <>⌖ {it.place}</>}
            </span>
          )}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="rounded-full bg-blush px-2 py-0.5 text-[10px] font-semibold text-sub">{KIND_LABEL[it.kind]}</span>
          {it.time && <span className="num text-[11px] text-sub">{it.time}</span>}
        </span>
      </Link>
      <OptimisticCheck done={!!it.done} action={TOGGLE[it.kind].bind(null, it.id)} label={it.label} />
    </li>
  );
}

function CatChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold whitespace-nowrap ${
        active ? "border-save bg-save text-on-save" : "border-line bg-card text-sub"
      }`}
    >
      {children}
    </button>
  );
}
