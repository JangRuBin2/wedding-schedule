"use client";
import { useFormStatus } from "react-dom";

/** 누르면 저장이 끝날 때까지 '처리 중' 표시 (서버 저장 중에도 눌린 게 보이게) */
export function SubmitButton({
  children,
  pendingText,
  className = "",
  base = "btn",
  confirm,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  base?: "btn" | "btn-ghost" | "";
  /** 있으면 누를 때 한 번 묻고, 취소하면 보내지 않음 (지우기 같은 것) */
  confirm?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      className={`${base} disabled:opacity-50 ${className}`}
      disabled={pending}
      aria-busy={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? pendingText ?? "저장 중…" : children}
    </button>
  );
}
