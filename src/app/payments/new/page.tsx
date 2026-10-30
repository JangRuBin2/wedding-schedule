import { prisma } from "@/lib/db";
import { fromYmd } from "@/lib/dates";
import { DueFields } from "@/components/DueFields";
import { EventSelect } from "@/components/EventSelect";
import { SubmitButton } from "@/components/SubmitButton";
import { WriteHeader } from "@/components/WriteHeader";
import { addDue } from "../../actions";

export const dynamic = "force-dynamic";

/** 캘린더에서 바로 결제 추가: 이벤트를 고르고, 고른 날짜를 미리 채움. 저장하면 그 날짜의 캘린더로 */
export default async function NewDueFromCalendarPage({ searchParams }: { searchParams: Promise<{ date?: string | string[] }> }) {
  const sp = await searchParams;
  const date = typeof sp.date === "string" && fromYmd(sp.date) ? sp.date : "";
  const back = date ? `/?date=${date}` : "/";
  const events = await prisma.event.findMany({
    orderBy: [{ order: "asc" }],
    select: { id: true, title: true, category: true, date: true, done: true },
  });
  return (
    <main className="space-y-6">
      <WriteHeader back={back} backLabel="취소" title="결제 추가" sub="금액을 넣으면 예산 탭에 쌓여요" />
      <form action={addDue} className="card space-y-5">
        <input type="hidden" name="back" value={back} />
        <EventSelect events={events} />
        <DueFields date={date} isNew />
        <SubmitButton pendingText="저장 중…" className="w-full">저장</SubmitButton>
      </form>
    </main>
  );
}
