"use client";
import { useEffect, useId, useRef, useState } from "react";

/**
 * 설명 툴팁. 화면에는 작은 ⓘ 만 두고, 누르면(휴대폰) 또는 마우스를 올리면(컴퓨터) 말풍선으로 보여 줌.
 * 바깥을 누르거나 Esc 를 누르면 닫힘
 */
export function Tip({ children, label = "설명 보기", align = "left" }: { children: React.ReactNode; label?: string; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <span
      ref={ref}
      className="relative inline-flex align-middle"
      // 마우스 올림은 진짜 마우스일 때만 (휴대폰 탭은 '올림 + 클릭'이 같이 와서 열자마자 닫혀 버림)
      onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className="flex h-[18px] w-[18px] items-center justify-center rounded-full text-faint hover:text-sub"
      >
        <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <circle cx="10" cy="10" r="7.5" />
          <path d="M10 9v4.5M10 6.4v.1" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className={`absolute top-full z-30 mt-1.5 w-max max-w-[240px] rounded-xl bg-ink px-3 py-2 text-left text-[12px] leading-relaxed font-normal whitespace-normal text-paper shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {children}
        </span>
      )}
    </span>
  );
}
