"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { completeEvents, deleteEvents, toggleEvent } from "@/app/actions";
import { OptimisticCheck } from "./OptimisticCheck";

export type ManagedEvent = {
  id: string;
  title: string;
  color: string;
  /** '7월 22일 · 100일 지남 · 할 일 1/4' 같은 한 줄 */
  sub: string;
  overdue: boolean;
  done: boolean;
};

/**
 * 리스트 탭: 평소엔 완료 체크 + 이벤트로 이동, '선택'을 누르면 여러 개 골라 한 번에 완료·삭제.
 * 삭제는 되돌릴 수 없어서 한 번 더 물어봄
 */
export function EventManager({ events }: { events: ManagedEvent[] }) {
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const all = picked.size === events.length && events.length > 0;

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const exit = () => {
    setSelecting(false);
    setPicked(new Set());
  };
  const run = (fn: (ids: string[]) => Promise<void>) =>
    start(async () => {
      await fn([...picked]);
      exit();
    });

  if (events.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        {selecting ? (
          <button type="button" onClick={() => setPicked(all ? new Set() : new Set(events.map((e) => e.id)))} className="text-[13px] font-semibold text-sub">
            {all ? "전체 해제" : "전체 선택"}
          </button>
        ) : (
          <span className="text-[13px] text-sub">{events.length}개</span>
        )}
        <button type="button" onClick={() => (selecting ? exit() : setSelecting(true))} className="text-[13px] font-semibold text-save">
          {selecting ? "취소" : "선택"}
        </button>
      </div>

      <ul className="card ledger !py-1">
        {events.map((e) => {
          const on = picked.has(e.id);
          const body = (
            <>
              <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: e.color, opacity: e.done ? 0.4 : 1 }} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-[15px] font-semibold ${e.done ? "text-sub line-through decoration-1" : ""}`}>{e.title}</span>
                <span className={`num block truncate text-[12px] ${e.overdue ? "text-spend" : "text-sub"}`}>{e.sub}</span>
              </span>
            </>
          );
          return (
            <li key={e.id} className="flex items-center gap-3">
              {selecting ? (
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-3">
                  <input type="checkbox" checked={on} onChange={() => toggle(e.id)} className="h-5 w-5 shrink-0 accent-[var(--color-save)]" aria-label={`${e.title} 선택`} />
                  {body}
                </label>
              ) : (
                <>
                  <OptimisticCheck done={e.done} action={toggleEvent.bind(null, e.id)} label={e.title} />
                  <Link href={`/events/${e.id}`} className="flex min-w-0 flex-1 items-center gap-3 py-3">
                    {body}
                    <span className="text-faint" aria-hidden>›</span>
                  </Link>
                </>
              )}
            </li>
          );
        })}
      </ul>

      {selecting && (
        // 아래 탭 바로 위에 붙는 작업 줄
        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+62px)] z-20 px-4 md:bottom-4">
          <div className="card mx-auto flex max-w-xl items-center gap-2 !py-3 shadow-lg">
            <span className="flex-1 text-[14px] font-semibold">{picked.size}개 선택</span>
            <button
              type="button"
              disabled={!picked.size || pending}
              onClick={() => run(completeEvents)}
              className="btn-ghost !bg-save-soft !text-save disabled:opacity-40"
            >
              완료 처리
            </button>
            <button
              type="button"
              disabled={!picked.size || pending}
              onClick={() => {
                if (confirm(`이벤트 ${picked.size}개를 삭제할까요?\n포함된 할 일과 결제도 함께 삭제되며 되돌릴 수 없어요.`)) run(deleteEvents);
              }}
              className="btn-ghost !bg-spend-soft !text-spend disabled:opacity-40"
            >
              {pending ? "처리 중…" : "삭제"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
