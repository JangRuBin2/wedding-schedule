"use client";
import { useState, useTransition } from "react";
import { answerSupport } from "@/app/actions";

/**
 * 열심히 쓰는 사람에게 가끔 뜨는 후원 안내 (홈에서만). 어떤 버튼을 눌러도 바로 닫힘.
 * 커피 보내기는 새 창(카카오페이 송금 등)으로 열고 180일 동안 다시 안 띄움
 */
export function SupportPrompt({ url, done }: { url: string; done: number }) {
  const [open, setOpen] = useState(true);
  const [, start] = useTransition();
  if (!open) return null;
  const answer = (kind: "later" | "never" | "supported") => {
    setOpen(false);
    start(() => answerSupport(kind));
  };
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/35 p-4 pb-[calc(env(safe-area-inset-bottom)+84px)] md:items-center md:pb-4" role="dialog" aria-modal="true" aria-labelledby="support-title">
      <div className="card w-full max-w-sm space-y-4 text-center shadow-xl">
        <div className="text-[40px] leading-none" aria-hidden>
          ☕
        </div>
        <div className="space-y-1.5">
          <h2 id="support-title" className="text-[18px] font-bold">
            봄날이 결혼 준비에 도움이 되고 있나요?
          </h2>
          <p className="text-[14px] leading-relaxed text-sub">
            벌써 <b className="font-semibold text-ink">{done}개</b>를 끝냈어요. 봄날은 혼자 만들고 있는 앱이에요.
            <br />
            커피 한 잔 값으로 응원해 주시면 서버비와 새 기능에 쓸게요.
          </p>
        </div>
        <div className="space-y-2">
          <a href={url} target="_blank" rel="noopener noreferrer" onClick={() => answer("supported")} className="btn block w-full">
            ☕ 커피 한 잔 보내기
          </a>
          <button type="button" onClick={() => answer("later")} className="btn-ghost w-full !py-2.5 !text-[14px]">
            나중에
          </button>
          <button type="button" onClick={() => answer("never")} className="block w-full pt-1 text-[12px] font-semibold text-faint">
            다시 보지 않기
          </button>
        </div>
        <p className="text-[11px] text-faint">언제든 마이 → 개발자에게 커피 한 잔에서 할 수 있어요</p>
      </div>
    </div>
  );
}
