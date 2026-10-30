import { redirect } from "next/navigation";
import { getWedding } from "@/lib/data";
import { Logo } from "@/components/Logo";
import { Tip } from "@/components/Tip";
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
          <span className="label flex items-center gap-1">결혼식 날짜 (선택)<Tip>날짜를 입력하면 기본 일정에 추천 날짜가 채워져요</Tip></span>
          <input name="date" type="date" className="input" />
        </label>
        <fieldset className="space-y-1">
          <legend className="label mb-1 flex items-center gap-1">우리 둘 이름 (선택)<Tip>완료 기록에 누가 체크했는지 표시할 때 사용해요</Tip></legend>
          <div className="flex gap-2">
            <input name="name1" placeholder="예: 민준" maxLength={30} className="input" />
            <input name="name2" placeholder="예: 지은" maxLength={30} className="input" />
          </div>
        </fieldset>
        <div className="space-y-2 border-t border-line pt-4">
          <SubmitButton pendingText="준비 중…" className="w-full">
            기본 일정으로 시작하기
          </SubmitButton>
          {/* 같은 폼이라 날짜·이름은 그대로 저장되고 이벤트만 안 만듦 */}
          <button name="template" value="no" className="block w-full pt-2 text-center text-[13px] font-semibold text-sub">
            빈 상태로 시작하기
          </button>
        </div>
      </form>
    </main>
  );
}
