import Link from "next/link";
import { notFound } from "next/navigation";
import type { JSONContent } from "@tiptap/core";
import { scoped } from "@/lib/tenant";
import { dateTimeLabel } from "@/lib/dates";
import { noteTitle } from "@/lib/note-doc";
import { NoteBody } from "@/components/notes/NoteBody";

export const dynamic = "force-dynamic";

/** 메모 보기 (보기 화면). 고치기는 작성 화면에서 */
export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const db = await scoped();
  const { id } = await params;
  const n = await db.note.findUnique({ where: { id } });
  if (!n) notFound();
  const edited = n.updatedAt.getTime() - n.createdAt.getTime() > 1000;

  return (
    <main className="space-y-5">
      <div className="flex items-center justify-between pt-2">
        <Link href="/notes" className="text-[13px] font-semibold text-sub">‹ 메모</Link>
        <Link href={`/notes/${n.id}/edit`} className="text-[13px] font-semibold text-save">수정</Link>
      </div>

      <article className="card space-y-3">
        <header className="space-y-1">
          <h1 className="text-[20px] leading-snug font-bold break-words">{noteTitle(n)}</h1>
          <p className="num text-[12px] text-faint">
            {edited ? "고침 " : ""}
            {dateTimeLabel(edited ? n.updatedAt : n.createdAt)}
            {(edited ? n.updatedBy : n.createdBy) && ` · ${edited ? n.updatedBy : n.createdBy}`}
          </p>
        </header>
        <NoteBody content={n.content as JSONContent} />
      </article>
    </main>
  );
}
