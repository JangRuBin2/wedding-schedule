import { fromYmd } from "@/lib/dates";
import { getCategories } from "@/lib/categories";
import { EventFields } from "@/components/EventFields";
import { SubmitButton } from "@/components/SubmitButton";
import { WriteHeader } from "@/components/WriteHeader";
import { createEvent } from "../../actions";

export const dynamic = "force-dynamic";

type SP = Promise<{ date?: string | string[]; category?: string | string[] }>;

/** 이벤트 추가. 캘린더에서 날짜를 고르고 왔으면 ?date= 로 미리 채움 */
export default async function NewEventPage({ searchParams }: { searchParams: SP }) {
  const [sp, cats] = await Promise.all([searchParams, getCategories()]);
  const date = typeof sp.date === "string" && fromYmd(sp.date) ? sp.date : "";
  return (
    <main className="space-y-6">
      <WriteHeader back={date ? `/?date=${date}` : "/events"} backLabel="취소" title="이벤트 추가" sub="저장하면 이 이벤트 화면으로 가서 체크리스트와 결제를 이어서 채울 수 있어요" />
      <form action={createEvent} className="card space-y-5">
        <EventFields categories={cats} v={{ date, category: typeof sp.category === "string" ? sp.category : undefined }} />
        <SubmitButton pendingText="저장 중…" className="w-full">저장</SubmitButton>
      </form>
    </main>
  );
}
