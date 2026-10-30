import { prisma } from "@/lib/db";
import { fromYmd } from "@/lib/dates";
import { EventSelect } from "@/components/EventSelect";
import { SubmitButton } from "@/components/SubmitButton";
import { WriteHeader } from "@/components/WriteHeader";
import { addTask } from "../../actions";

export const dynamic = "force-dynamic";

/** 캘린더에서 바로 할 일 추가: 이벤트를 고르고, 고른 날짜를 미리 채움. 저장하면 그 날짜의 캘린더로 */
export default async function NewTaskFromCalendarPage({ searchParams }: { searchParams: Promise<{ date?: string | string[] }> }) {
  const sp = await searchParams;
  const date = typeof sp.date === "string" && fromYmd(sp.date) ? sp.date : "";
  const back = date ? `/?date=${date}` : "/";
  const events = await prisma.event.findMany({
    orderBy: [{ order: "asc" }],
    select: { id: true, title: true, category: true, date: true, done: true },
  });
  return (
    <main className="space-y-6">
      <WriteHeader back={back} backLabel="취소" title="할 일 추가" />
      <form action={addTask} className="card space-y-5">
        <input type="hidden" name="back" value={back} />
        <EventSelect events={events} />
        <label className="block space-y-1.5">
          <span className="label">할 일</span>
          <input name="content" placeholder="예: 촬영용 옷 구매" required autoFocus maxLength={200} className="input" />
        </label>
        <label className="block space-y-1.5">
          <span className="label">날짜</span>
          <input name="date" type="date" defaultValue={date} className="input" />
        </label>
        <SubmitButton pendingText="저장 중…" className="w-full">저장</SubmitButton>
      </form>
    </main>
  );
}
