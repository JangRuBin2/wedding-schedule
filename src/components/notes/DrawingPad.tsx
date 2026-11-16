"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  DRAW_H,
  DRAW_H_MAX,
  DRAW_H_STEP,
  DRAW_W,
  PEN_COLORS,
  PEN_SIZES,
  strokeHit,
  strokePath,
  type Drawing,
  type Stroke,
} from "@/lib/note-doc";

type Tool = "pen" | "eraser" | "hand";

const ERASER_RADIUS = 18;

/**
 * 그리기 모드 (화면 전체). 손가락·마우스·애플펜슬로 그림. 펜 / 지우개(획 단위) / 이동(손가락으로 스크롤)
 * '완료'를 눌러야 메모에 들어가고, '취소'는 바꾼 걸 버림. 메모 저장은 메모 화면의 저장 버튼으로
 */
export function DrawingPad({
  initial,
  onDone,
  onCancel,
  onDelete,
}: {
  initial: Drawing;
  onDone: (d: Drawing) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [strokes, setStrokes] = useState<Stroke[]>(initial.strokes);
  const [h, setH] = useState(initial.h);
  const [undo, setUndo] = useState<Stroke[][]>([]);
  const [redo, setRedo] = useState<Stroke[][]>([]);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState<string>(PEN_COLORS[0].color);
  const [size, setSize] = useState<number>(PEN_SIZES[1].size);
  const [live, setLive] = useState<Stroke | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const svg = useRef<SVGSVGElement>(null);
  const drawing = useRef<{ id: number; stroke: Stroke } | null>(null);
  const erasing = useRef<{ id: number; before: Stroke[] } | null>(null);
  const pointers = useRef(new Set<number>());

  // 그리는 동안 뒤 화면이 스크롤되지 않게
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const changed = strokes !== initial.strokes || h !== initial.h;

  const commit = (next: Stroke[], before = strokes) => {
    setUndo((u) => [...u.slice(-99), before]);
    setRedo([]);
    setStrokes(next);
  };

  const at = (e: React.PointerEvent): [number, number] => {
    const r = svg.current!.getBoundingClientRect();
    return [
      Math.round(((e.clientX - r.left) / r.width) * DRAW_W),
      Math.round(((e.clientY - r.top) / r.height) * h),
    ];
  };
  const pressure = (e: React.PointerEvent) => (e.pointerType === "pen" ? Math.round((e.pressure || 0.5) * 100) : 50);

  const down = (e: React.PointerEvent<SVGSVGElement>) => {
    if (tool === "hand") return;
    pointers.current.add(e.pointerId);
    // 두 손가락이 닿으면 그리던 획은 취소 (확대·스크롤하려던 것)
    if (pointers.current.size > 1) {
      drawing.current = null;
      setLive(null);
      if (erasing.current) {
        setStrokes(erasing.current.before);
        erasing.current = null;
      }
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = at(e);
    if (tool === "eraser") {
      erasing.current = { id: e.pointerId, before: strokes };
      setStrokes((list) => list.filter((s) => !strokeHit(s, x, y, ERASER_RADIUS)));
      return;
    }
    const stroke: Stroke = { c: color, s: size, p: [x, y, pressure(e)], ...(e.pointerType === "pen" ? { r: 1 as const } : {}) };
    drawing.current = { id: e.pointerId, stroke };
    setLive(stroke);
  };

  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    const [x, y] = at(e);
    if (erasing.current?.id === e.pointerId) {
      setStrokes((list) => {
        const kept = list.filter((s) => !strokeHit(s, x, y, ERASER_RADIUS));
        return kept.length === list.length ? list : kept;
      });
      return;
    }
    const cur = drawing.current;
    if (!cur || cur.id !== e.pointerId) return;
    const p = cur.stroke.p;
    // 거의 같은 자리는 건너뜀 (저장 크기 줄이기)
    if ((p[p.length - 3] - x) ** 2 + (p[p.length - 2] - y) ** 2 < 4) return;
    cur.stroke = { ...cur.stroke, p: [...p, x, y, pressure(e)] };
    setLive(cur.stroke);
  };

  const up = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    if (erasing.current?.id === e.pointerId) {
      const before = erasing.current.before;
      erasing.current = null;
      if (before.length !== strokes.length) commit(strokes, before);
      return;
    }
    const cur = drawing.current;
    if (!cur || cur.id !== e.pointerId) return;
    drawing.current = null;
    setLive(null);
    commit([...strokes, cur.stroke]);
  };

  const cancelPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    if (drawing.current?.id === e.pointerId) {
      drawing.current = null;
      setLive(null);
    }
    if (erasing.current?.id === e.pointerId) {
      setStrokes(erasing.current.before);
      erasing.current = null;
    }
  };

  const doUndo = () => {
    if (!undo.length) return;
    setRedo((r) => [...r, strokes]);
    setStrokes(undo[undo.length - 1]);
    setUndo((u) => u.slice(0, -1));
  };
  const doRedo = () => {
    if (!redo.length) return;
    setUndo((u) => [...u, strokes]);
    setStrokes(redo[redo.length - 1]);
    setRedo((r) => r.slice(0, -1));
  };

  // 키보드: Ctrl/Cmd+Z, Shift+Ctrl/Cmd+Z, Esc
  const keys = useRef({ doUndo, doRedo, onCancel });
  keys.current = { doUndo, doRedo, onCancel };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") keys.current.onCancel();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) keys.current.doRedo();
        else keys.current.doUndo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 아래쪽에 그린 게 있으면 그만큼은 못 줄임
  const lowest = strokes.reduce((m, s) => {
    for (let i = 1; i < s.p.length; i += 3) m = Math.max(m, s.p[i] + s.s);
    return m;
  }, 0);

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-paper" role="dialog" aria-modal="true" aria-label="그리기">
      <header className="flex items-center justify-between border-b border-line bg-card px-3 pt-[max(env(safe-area-inset-top),8px)] pb-2">
        <button type="button" onClick={onCancel} className="px-2 py-1.5 text-[14px] font-semibold text-sub">
          취소
        </button>
        <h2 className="text-[15px] font-bold">그리기</h2>
        <button
          type="button"
          onClick={() => onDone({ h, strokes })}
          className="btn !px-4 !py-1.5"
        >
          {changed ? "완료" : "닫기"}
        </button>
      </header>

      <div className="space-y-2 border-b border-line bg-card px-3 py-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <ToolButton active={tool === "pen"} onClick={() => setTool("pen")} label="펜">
            <path d="M4 20l4-1 10.5-10.5a2.1 2.1 0 0 0-3-3L5 16l-1 4z" />
          </ToolButton>
          <ToolButton active={tool === "eraser"} onClick={() => setTool("eraser")} label="지우개">
            <path d="M8 20h12M5.5 16.5l9-9a2 2 0 0 1 2.8 0l1.2 1.2a2 2 0 0 1 0 2.8L11 19H8z" />
          </ToolButton>
          <ToolButton active={tool === "hand"} onClick={() => setTool("hand")} label="이동 (손가락으로 스크롤)">
            <path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" />
          </ToolButton>
          <span className="mx-1 h-6 w-px shrink-0 bg-line" aria-hidden />
          <ToolButton onClick={doUndo} disabled={!undo.length} label="되돌리기">
            <path d="M9 7L4 12l5 5M4 12h11a5 5 0 0 1 0 10h-2" />
          </ToolButton>
          <ToolButton onClick={doRedo} disabled={!redo.length} label="다시 하기">
            <path d="M15 7l5 5-5 5M20 12H9a5 5 0 0 0 0 10h2" />
          </ToolButton>
          <span className="flex-1" />
          {confirmClear ? (
            <span className="flex shrink-0 items-center gap-1 text-[12px]">
              <button
                type="button"
                onClick={() => {
                  commit([]);
                  setConfirmClear(false);
                }}
                className="rounded-lg bg-spend-soft px-2 py-1.5 font-semibold text-spend"
              >
                다 지우기
              </button>
              <button type="button" onClick={() => setConfirmClear(false)} className="px-1.5 py-1.5 text-sub">
                아니요
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              disabled={!strokes.length}
              className="shrink-0 px-1.5 py-1.5 text-[12px] font-semibold text-sub disabled:opacity-40"
            >
              전체 지우기
            </button>
          )}
        </div>

        {tool === "pen" && (
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
            {PEN_COLORS.map((c) => (
              <button
                key={c.color}
                type="button"
                onClick={() => setColor(c.color)}
                aria-label={c.label}
                aria-pressed={color === c.color}
                className={`h-7 w-7 shrink-0 rounded-full border-2 ${color === c.color ? "border-ink" : "border-transparent"}`}
              >
                <span className="m-auto block h-5 w-5 rounded-full" style={{ background: c.color }} />
              </button>
            ))}
            <span className="mx-1 h-6 w-px shrink-0 bg-line" aria-hidden />
            {PEN_SIZES.map((s) => (
              <button
                key={s.size}
                type="button"
                onClick={() => setSize(s.size)}
                aria-label={s.label}
                aria-pressed={size === s.size}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${size === s.size ? "bg-save-soft" : ""}`}
              >
                <span className="block rounded-full" style={{ width: 4 + s.size / 2, height: 4 + s.size / 2, background: color }} />
              </button>
            ))}
          </div>
        )}
        {tool === "eraser" && <p className="py-1 text-[12px] text-sub">문지르면 닿은 획이 통째로 지워져요</p>}
        {tool === "hand" && <p className="py-1 text-[12px] text-sub">손가락으로 위아래로 움직여요. 다시 그리려면 펜을 누르세요</p>}
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4">
        <div className="mx-auto max-w-3xl">
          <svg
            ref={svg}
            viewBox={`0 0 ${DRAW_W} ${h}`}
            className={`draw-paper block h-auto w-full rounded-xl border border-line select-none ${tool === "eraser" ? "cursor-cell" : tool === "hand" ? "cursor-grab" : "cursor-crosshair"}`}
            style={{ touchAction: tool === "hand" ? "pan-y" : "none" }}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={cancelPointer}
            onContextMenu={(e) => e.preventDefault()}
          >
            {strokes.map((s, i) => (
              <path key={i} d={strokePath(s)} fill={s.c} />
            ))}
            {live && <path d={strokePath(live, false)} fill={live.c} />}
          </svg>
          <div className="mt-3 flex items-center justify-center gap-2 text-[13px]">
            <button
              type="button"
              onClick={() => setH((v) => Math.min(DRAW_H_MAX, v + DRAW_H_STEP))}
              disabled={h >= DRAW_H_MAX}
              className="btn-ghost disabled:opacity-40"
            >
              ↓ 아래로 늘리기
            </button>
            {h > DRAW_H ? (
              <button
                type="button"
                onClick={() => setH((v) => Math.max(DRAW_H, Math.ceil(lowest), v - DRAW_H_STEP))}
                disabled={Math.max(DRAW_H, lowest) >= h}
                className="btn-ghost disabled:opacity-40"
              >
                ↑ 줄이기
              </button>
            ) : null}
          </div>
          {onDelete && (
            <p className="mt-6 text-center">
              <button type="button" onClick={onDelete} className="text-[13px] font-semibold text-spend">
                이 그림 빼기
              </button>
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ToolButton({
  children,
  label,
  onClick,
  active,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl disabled:opacity-35 ${active ? "bg-save-soft text-ink" : "text-sub"}`}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
    </button>
  );
}
