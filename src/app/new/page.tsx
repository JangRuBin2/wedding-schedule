import { prisma } from "@/lib/db";
import { getCategories } from "@/lib/categories";
import { fromYmd } from "@/lib/dates";
import { KINDS, type Kind } from "@/lib/meta";
import { DueFields } from "@/components/DueFields";
import { EventFields } from "@/components/EventFields";
import { EventSelect } from "@/components/EventSelect";
import { KindSwitch } from "@/components/KindSwitch";
import { SubmitButton } from "@/components/SubmitButton";
import { WriteHeader } from "@/components/WriteHeader";
import { createEntry } from "../actions";

export const dynamic = "force-dynamic";

type SP = Promise<{ date?: string | string[]; kind?: string | string[] }>;

/** 추가 (작성 화면): 이벤트·할 일·결제를 여기서 골라 적음. 캘린더에서 고른 날짜를 미리 채우고, 저장하면 그 날짜의 캘린더로 */
export default async function NewEntryPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const date = typeof sp.date === "string" && fromYmd(sp.date) ? sp.date : "";
  const initial: Kind = typeof sp.kind === "string" && sp.kind in KINDS ? (sp.kind as Kind) : "event";
  const back = date ? `/?date=${date}` : "/";
  const [cats, events] = await Promise.all([
    getCategories(),
    prisma.event.findMany({ orderBy: [{ order: "asc" }], select: { id: true, title: true, category: true, date: true, done: true } }),
  ]);
  return (
    <main className="space-y-6">
      <WriteHeader back={back} backLabel="취소" title="추가" />
      <form action={createEntry} className="card space-y-5">
        <input type="hidden" name="back" value={back} />
        <KindSwitch
          initial={initial}
          sections={{
            event: <EventFields categories={cats} v={{ date }} />,
            task: (
              <>
                <EventSelect events={events} />
                <label className="block space-y-1.5">
                  <span className="label">할 일</span>
                  <input name="content" placeholder="예: 촬영용 옷 구매" required maxLength={200} className="input" />
                </label>
                <label className="block space-y-1.5">
                  <span className="label">날짜</span>
                  <input name="date" type="date" defaultValue={date} className="input" />
                </label>
              </>
            ),
            due: (
              <>
                <EventSelect events={events} />
                <DueFields date={date} isNew />
              </>
            ),
          }}
        />
        <SubmitButton pendingText="저장 중…" className="w-full">저장</SubmitButton>
      </form>
    </main>
  );
}
