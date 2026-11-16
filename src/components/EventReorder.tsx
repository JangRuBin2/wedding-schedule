"use client";
import { useState, useTransition } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { reorderEvents } from "@/app/actions";
import type { ManagedEvent } from "./EventManager";

/**
 * 리스트 순서 바꾸기: 오른쪽 손잡이(≡)를 끌어서 옮기고 '완료'로 저장.
 * 휴대폰은 손잡이를 살짝 눌렀다 끌면 됨 (그냥 쓸면 화면 스크롤). 위·아래 버튼으로도 한 칸씩
 */
export function EventReorder({ events, onDone }: { events: ManagedEvent[]; onDone: () => void }) {
  const [list, setList] = useState(events);
  const [pending, start] = useTransition();
  const changed = list.some((e, i) => e.id !== events[i].id);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setList((l) => arrayMove(l, l.findIndex((e) => e.id === active.id), l.findIndex((e) => e.id === over.id)));
  };
  const move = (i: number, d: -1 | 1) => setList((l) => (i + d < 0 || i + d >= l.length ? l : arrayMove(l, i, i + d)));
  const save = () =>
    start(async () => {
      if (changed) await reorderEvents(list.map((e) => e.id));
      onDone();
    });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-[13px] text-sub">≡ 를 끌어서 순서를 바꿔요</span>
        <span className="flex items-center gap-3">
          <button type="button" onClick={onDone} disabled={pending} className="text-[13px] font-semibold text-sub">
            취소
          </button>
          <button type="button" onClick={save} disabled={pending} className="btn !px-3.5 !py-1.5 text-[13px] disabled:opacity-60">
            {pending ? "저장 중…" : "완료"}
          </button>
        </span>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} modifiers={[restrictToVerticalAxis, restrictToParentElement]}>
        <SortableContext items={list.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          <ul className="card ledger !py-1">
            {list.map((e, i) => (
              <Row key={e.id} e={e} first={i === 0} last={i === list.length - 1} onUp={() => move(i, -1)} onDown={() => move(i, 1)} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function Row({ e, first, last, onUp, onDown }: { e: ManagedEvent; first: boolean; last: boolean; onUp: () => void; onDown: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: e.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative flex items-center gap-2 bg-card ${isDragging ? "z-10 rounded-xl shadow-lg" : ""}`}
    >
      <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: e.color, opacity: e.done ? 0.4 : 1 }} aria-hidden />
      <span className="min-w-0 flex-1 py-3 pl-1">
        <span className={`block truncate text-[15px] font-semibold ${e.done ? "text-sub line-through decoration-1" : ""}`}>{e.title}</span>
        <span className="num block truncate text-[12px] text-sub">{e.sub}</span>
      </span>
      <button type="button" onClick={onUp} disabled={first} aria-label={`${e.title} 위로`} className="h-8 w-7 shrink-0 text-[13px] text-sub disabled:opacity-25">
        ▲
      </button>
      <button type="button" onClick={onDown} disabled={last} aria-label={`${e.title} 아래로`} className="h-8 w-7 shrink-0 text-[13px] text-sub disabled:opacity-25">
        ▼
      </button>
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`${e.title} 끌어서 옮기기`}
        className="flex h-10 w-9 shrink-0 cursor-grab touch-none items-center justify-center text-[20px] text-faint active:cursor-grabbing"
      >
        ≡
      </button>
    </li>
  );
}
