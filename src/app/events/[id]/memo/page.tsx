import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SubmitButton } from "@/components/SubmitButton";
import { WriteHeader } from "@/components/WriteHeader";
import { saveMemo } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function EventMemoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await prisma.event.findUnique({ where: { id }, select: { id: true, title: true, memo: true } });
  if (!e) notFound();
  return (
    <main className="space-y-6">
      <WriteHeader back={`/events/${e.id}`} backLabel="취소" title={e.memo ? "메모 수정" : "메모 쓰기"} sub={e.title} />
      <form action={saveMemo} className="card space-y-4">
        <input type="hidden" name="id" value={e.id} />
        <textarea
          name="memo"
          defaultValue={e.memo ?? ""}
          rows={10}
          autoFocus
          maxLength={5000}
          placeholder="예: 머리 시안 어떻게 하지? 업체에 물어볼 것"
          className="input resize-y text-[15px] leading-relaxed"
        />
        <SubmitButton pendingText="저장 중…" className="w-full">저장</SubmitButton>
      </form>
    </main>
  );
}
