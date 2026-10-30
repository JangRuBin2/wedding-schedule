import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { suggestionsFor } from "@/lib/templates";
import { SubmitButton } from "@/components/SubmitButton";
import { WriteHeader } from "@/components/WriteHeader";
import { addTask } from "../../../../actions";

export const dynamic = "force-dynamic";

export default async function NewTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await prisma.event.findUnique({ where: { id }, select: { id: true, title: true, templateKey: true, tasks: { select: { content: true } } } });
  if (!e) notFound();
  const suggestions = suggestionsFor(e.templateKey, e.tasks);
  return (
    <main className="space-y-6">
      <WriteHeader back={`/events/${e.id}`} backLabel="취소" title="할 일 추가" sub={e.title} />
      <form action={addTask} className="card space-y-5">
        <input type="hidden" name="eventId" value={e.id} />
        <label className="block space-y-1">
          <span className="label">할 일</span>
          <input name="content" placeholder="예: 촬영용 옷 구매" required autoFocus maxLength={200} className="input" />
        </label>
        <label className="block space-y-1">
          <span className="label">날짜 (선택)</span>
          <input name="date" type="date" className="input" />
          <span className="block text-[12px] text-sub">날짜를 넣으면 홈의 곧 할 일과 캘린더에도 보여요</span>
        </label>
        <SubmitButton pendingText="저장 중…" className="w-full">저장</SubmitButton>
        {suggestions.length > 0 && (
          <div className="space-y-2 border-t border-line pt-4">
            <p className="label">추천 할 일 · 누르면 바로 추가돼요</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                // 위의 '할 일' 칸이 비어 있어도 되게 formNoValidate
                <button key={s.content} name="pick" value={s.content} formNoValidate className="chip">
                  + {s.content}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
    </main>
  );
}
