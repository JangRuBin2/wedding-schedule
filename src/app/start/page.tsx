import { redirect } from "next/navigation";
import { getWedding } from "@/lib/data";
import { Logo } from "@/components/Logo";
import { SubmitButton } from "@/components/SubmitButton";
import { start } from "../actions";

export const dynamic = "force-dynamic";

/** 처음 쓰는 사람: 결혼식 날짜·우리 둘 이름 → 20개 이벤트로 시작(추천 일정까지) 또는 빈 상태로 */
export default async function StartPage() {
  if (await getWedding()) redirect("/");
  return (
    <main className="space-y-6">
      <header className="flex flex-col items-center gap-3 pt-6 text-center">
        <Logo size={64} />
        <div>
          <h1 className="serif text-[36px] leading-tight">Our Wedding</h1>
          <p className="mt-1 text-[14px] text-sub">지금, 우리의 결혼을 준비하는 중이에요</p>
        </div>
      </header>
      <form action={start} className="card space-y-5">
        <label className="block space-y-1">
          <span className="label">결혼식 날짜 (몰라도 괜찮아요)</span>
          <input name="date" type="date" className="input" />
          <span className="block text-[12px] text-sub">날짜를 넣으면 이벤트마다 추천 일정을 채워 드려요</span>
        </label>
        <fieldset className="space-y-1">
          <legend className="label mb-1">우리 둘 이름 (선택)</legend>
          <div className="flex gap-2">
            <input name="name1" placeholder="예: 민준" maxLength={30} className="input" />
            <input name="name2" placeholder="예: 지은" maxLength={30} className="input" />
          </div>
          <span className="block text-[12px] text-sub">누가 체크했는지 남길 때 써요</span>
        </fieldset>
        <div className="space-y-2 border-t border-line pt-4">
          <SubmitButton pendingText="만드는 중…" className="w-full">
            20개 이벤트로 시작하기
          </SubmitButton>
          <p className="text-center text-[12px] leading-relaxed text-sub">양가 인사부터 웨딩홀·스드메·청첩장·신혼여행까지 순서대로 만들어 드려요</p>
          {/* 같은 폼이라 날짜·이름은 그대로 저장되고 이벤트만 안 만듦 */}
          <button name="template" value="no" className="block w-full pt-2 text-center text-[13px] font-semibold text-sub">
            이벤트 없이 직접 만들게요
          </button>
        </div>
      </form>
    </main>
  );
}
