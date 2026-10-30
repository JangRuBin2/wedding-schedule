"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { LinkPending } from "./LinkPending";

export type CalItem = {
  key: string;
  /** KST 기준 YYYY-MM-DD */
  ymd: string;
  kind: "event" | "task" | "due";
  label: string;
  sub?: string;
  href: string;
  color: string;
  done?: boolean;
};

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
const KIND_ORDER = { event: 0, task: 1, due: 2 } as const;
const KIND_LABEL = { event: "이벤트", task: "할 일", due: "돈 낼 날" } as const;
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * 한 달 캘린더. 달 넘기기·날짜 고르기는 화면 안에서만 바뀜(서버에 다시 묻지 않음).
 * 점 색은 이벤트 카테고리 색. 고른 날짜로 이벤트를 만들 수 있음
 */
export function Calendar({ items, today }: { items: CalItem[]; today: string }) {
  const [ty, tm] = today.split("-").map(Number);
  const [view, setView] = useState({ y: ty, m: tm - 1 });
  const [selected, setSelected] = useState<string>(today);

  const byDay = useMemo(() => {
    const map = new Map<string, CalItem[]>();
    for (const it of items) map.set(it.ymd, [...(map.get(it.ymd) ?? []), it]);
    for (const list of map.values()) list.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
    return map;
  }, [items]);

  const first = new Date(Date.UTC(view.y, view.m, 1)).getUTCDay();
  const days = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const ymd = (d: number) => `${view.y}-${pad(view.m + 1)}-${pad(d)}`;
  const monthCount = items.filter((it) => it.ymd.startsWith(`${view.y}-${pad(view.m + 1)}`)).length;

  const move = (delta: number) => {
    const d = new Date(Date.UTC(view.y, view.m + delta, 1));
    const next = { y: d.getUTCFullYear(), m: d.getUTCMonth() };
    setView(next);
    // 그 달에 일정이 있으면 첫 일정 날짜, 이번 달이면 오늘
    const prefix = `${next.y}-${pad(next.m + 1)}`;
    const firstDay = [...byDay.keys()].filter((k) => k.startsWith(prefix)).sort()[0];
    setSelected(next.y === ty && next.m === tm - 1 ? today : firstDay ?? `${prefix}-01`);
  };

  const dayItems = byDay.get(selected) ?? [];
  const [, sm, sd] = selected.split("-").map(Number);

  return (
    <section className="space-y-3">
      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" onClick={() => move(-1)} aria-label="이전 달" className="btn-ghost !bg-paper !px-3">‹</button>
          <button
            type="button"
            onClick={() => {
              setView({ y: ty, m: tm - 1 });
              setSelected(today);
            }}
            className="text-center"
            title="오늘로"
          >
            <span className="num block text-[16px] font-bold">
              {view.y}년 {view.m + 1}월
            </span>
            <span className="block text-[11px] text-sub">{monthCount ? `일정 ${monthCount}개` : "일정 없음"}</span>
          </button>
          <button type="button" onClick={() => move(1)} aria-label="다음 달" className="btn-ghost !bg-paper !px-3">›</button>
        </div>
        <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-faint">
          {WEEK.map((w, i) => (
            <span key={w} className={i === 0 ? "text-spend/70" : ""}>{w}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-y-1">
          {cells.map((d, i) => {
            if (d == null) return <span key={`b${i}`} />;
            const key = ymd(d);
            const isToday = key === today;
            const isSel = key === selected;
            const list = byDay.get(key) ?? [];
            return (
              <button
                type="button"
                key={key}
                onClick={() => setSelected(key)}
                aria-pressed={isSel}
                aria-label={`${view.m + 1}월 ${d}일${list.length ? `, 일정 ${list.length}개` : ""}`}
                className={`flex h-12 flex-col items-center justify-start gap-1 rounded-xl pt-1.5 transition-colors ${isSel ? "bg-save-soft" : "active:bg-paper"}`}
              >
                <span
                  className={`num flex h-6 w-6 items-center justify-center rounded-full text-[13px] ${
                    isToday ? "bg-save font-bold text-white" : isSel ? "font-bold text-save" : ""
                  }`}
                >
                  {d}
                </span>
                <span className="flex gap-[3px]">
                  {list.slice(0, 3).map((it) => (
                    <span
                      key={it.key}
                      className={`h-1.5 w-1.5 ${it.kind === "due" ? "rotate-45 rounded-[1px]" : "rounded-full"}`}
                      style={{ background: it.color, opacity: it.done ? 0.35 : 1 }}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 border-t border-line pt-3 text-[11px] text-sub">점 색은 카테고리 · ◆ 모양은 돈 낼 날</p>
      </div>

      <div>
        <h2 className="section-title">
          {sm}월 {sd}일
          <Link href={`/events/new?date=${selected}`} className="relative text-[13px] font-semibold text-save">
            + 이날 이벤트
            <LinkPending />
          </Link>
        </h2>
        <ul className="card ledger !py-1">
          {dayItems.map((it) => (
            <li key={it.key}>
              <Link href={it.href} className="flex items-center gap-3 py-3">
                <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: it.color }} />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[15px] font-semibold ${it.done ? "text-sub line-through" : ""}`}>{it.label}</span>
                  <span className="block truncate text-[12px] text-sub">
                    {KIND_LABEL[it.kind]}
                    {it.sub && ` · ${it.sub}`}
                  </span>
                </span>
                <span className="text-faint" aria-hidden>›</span>
              </Link>
            </li>
          ))}
          {dayItems.length === 0 && <li className="py-6 text-center text-[13px] text-sub">이날은 일정이 없어요</li>}
        </ul>
      </div>
    </section>
  );
}
