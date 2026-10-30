import { getWedding } from "@/lib/data";
import { safeBack } from "@/lib/back";
import { ymd } from "@/lib/dates";
import { SubmitButton } from "@/components/SubmitButton";
import { WriteHeader } from "@/components/WriteHeader";
import { saveWedding } from "../../actions";

export const dynamic = "force-dynamic";

export default async function WeddingSettingsPage({ searchParams }: { searchParams: Promise<{ back?: string | string[] }> }) {
  const [wedding, sp] = await Promise.all([getWedding(), searchParams]);
  const back = safeBack(sp.back, "/settings");
  return (
    <main className="space-y-6">
      <WriteHeader back={back} backLabel="취소" title="결혼식 날짜·장소" sub="날짜를 바꿔도 이미 잡힌 이벤트 날짜는 그대로예요. 날짜가 없는 기본 이벤트만 이벤트 화면에서 추천 일정으로 채울 수 있어요" />
      <form action={saveWedding} className="card space-y-5">
        <input type="hidden" name="back" value={back} />
        <label className="block space-y-1">
          <span className="label">결혼식 날짜</span>
          <input name="date" type="date" defaultValue={wedding?.date ? ymd(wedding.date) : ""} autoFocus className="input" />
        </label>
        <label className="block space-y-1">
          <span className="label">장소 (선택)</span>
          <input name="place" defaultValue={wedding?.place ?? ""} placeholder="예: 더채플앳청담" maxLength={100} className="input" />
        </label>
        <SubmitButton pendingText="저장 중…" className="w-full">저장</SubmitButton>
      </form>
    </main>
  );
}
