import { notFound } from "next/navigation";
import type { JSONContent } from "@tiptap/core";
import { scoped } from "@/lib/tenant";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { SubmitButton } from "@/components/SubmitButton";
import { WriteHeader } from "@/components/WriteHeader";
import { deleteNote } from "../../../actions";

export const dynamic = "force-dynamic";

/** 메모 고치기 (작성 화면) */
export default async function EditNotePage({ params }: { params: Promise<{ id: string }> }) {
  const db = await scoped();
  const { id } = await params;
  const n = await db.note.findUnique({ where: { id }, select: { id: true, title: true, content: true } });
  if (!n) notFound();
  return (
    <main className="space-y-5">
      <WriteHeader back={`/notes/${n.id}`} backLabel="취소" title="메모 수정" />
      <NoteEditor id={n.id} title={n.title} content={n.content as JSONContent} />
      <form action={deleteNote.bind(null, n.id)} className="text-center">
        <SubmitButton base="btn-ghost" className="!text-spend" pendingText="삭제 중…">
          이 메모 삭제
        </SubmitButton>
      </form>
    </main>
  );
}
