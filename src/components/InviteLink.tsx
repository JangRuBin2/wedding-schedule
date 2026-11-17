"use client";
import { useState } from "react";

/** 초대 링크 보여 주기 + 공유(휴대폰 공유 창) / 복사 */
export function InviteLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const text = "봄날에서 결혼 준비 일정을 같이 써요. 링크를 눌러 들어와 주세요";
    try {
      if (navigator.share) {
        await navigator.share({ title: "봄날 초대", text, url });
        return;
      }
    } catch {
      return; // 공유 창을 닫은 경우
    }
    await navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center gap-2">
      <code className="num min-w-0 flex-1 truncate rounded-lg bg-paper px-2.5 py-2 text-[12px] text-sub">{url}</code>
      <button type="button" onClick={share} className="btn shrink-0 !px-3 !py-2 text-[13px]">
        {copied ? "복사됨" : "보내기"}
      </button>
    </div>
  );
}
