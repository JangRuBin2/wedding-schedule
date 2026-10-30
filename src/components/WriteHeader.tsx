import Link from "next/link";
import { Tip } from "./Tip";

/** 작성 화면 맨 위: 돌아가기 + 제목 (설명은 제목 옆 툴팁). 저장하지 않고 돌아가면 아무것도 바뀌지 않음 */
export function WriteHeader({ back, backLabel, title, sub }: { back: string; backLabel: string; title: string; sub?: string }) {
  return (
    <header className="space-y-2">
      <Link href={back} className="text-[13px] font-semibold text-sub">
        ‹ {backLabel}
      </Link>
      <h1 className="flex items-center gap-1.5 text-[22px] font-bold">
        {title}
        {sub && <Tip>{sub}</Tip>}
      </h1>
    </header>
  );
}
