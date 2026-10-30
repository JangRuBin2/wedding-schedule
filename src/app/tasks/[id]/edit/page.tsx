import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { safeBack } from "@/lib/back";
import { ymd } from "@/lib/dates";
import { SubmitButton } from "@/components/SubmitButton";
import { WriteHeader } from "@/components/WriteHeader";
import { deleteTask, updateTask } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function EditTaskPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ back?: string | string[] }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const t = await prisma.task.findUnique({ where: { id }, include: { event: { select: { id: true, title: true } } } });
  if (!t) notFound();
  const back = safeBack(sp.back, `/events/${t.event.id}`);
  return (
    <main className="space-y-6">
      <WriteHeader back={back} backLabel="취소" title="할 일 수정" sub={t.event.title} />
      <form action={updateTask} className="card space-y-5">
        <input type="hidden" name="id" value={t.id} />
        <input type="hidden" name="back" value={back} />
        <label className="block space-y-1">
          <span className="label">할 일</span>
          <input name="content" defaultValue={t.content} required maxLength={200} className="input" />
        </label>
        <label className="block space-y-1">
          <span className="label">날짜 (선택)</span>
          <input name="date" type="date" defaultValue={t.date ? ymd(t.date) : ""} className="input" />
        </label>
        <SubmitButton pendingText="저장 중…" className="w-full">저장</SubmitButton>
      </form>
      <form action={deleteTask.bind(null, t.id, back)} className="text-center">
        <SubmitButton base="btn-ghost" className="!text-spend" pendingText="삭제 중…">이 할 일 삭제</SubmitButton>
      </form>
    </main>
  );
}
