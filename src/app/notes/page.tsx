import Link from "next/link";
import { prisma } from "@/lib/db";
import { dateTimeLabel } from "@/lib/dates";
import { notePreview, noteTitle } from "@/lib/note-doc";

export const dynamic = "force-dynamic";

/** 메모 목록 (보기 화면). 최근에 고친 순 */
export default async function NotesPage() {
  const notes = await prisma.note.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, text: true, drawings: true, updatedAt: true, updatedBy: true },
  });

  return (
    <main className="space-y-6">
      <header className="flex items-end justify-between gap-3 pt-2">
        <div>
          <h1 className="text-[22px] font-bold">메모</h1>
          <p className="num text-[13px] text-sub">{notes.length}개</p>
        </div>
        <Link href="/notes/new" className="btn shrink-0 !px-3.5 !py-2 text-[13px]">
          + 새 메모
        </Link>
      </header>

      {notes.length === 0 ? (
        <Link href="/notes/new" className="card block space-y-1 text-[14px] text-sub">
          <span className="block">업체에 물어볼 것, 하객 명단, 드레스 스케치처럼 이벤트에 딱 안 맞는 것도 여기에 적어 두세요.</span>
          <span className="block">글로 쓰고 손으로 그릴 수도 있어요. <b className="font-semibold text-save">첫 메모 쓰기 ›</b></span>
        </Link>
      ) : (
        <ul className="card ledger !py-1">
          {notes.map((n) => {
            const preview = notePreview(n);
            return (
              <li key={n.id}>
                <Link href={`/notes/${n.id}`} className="block space-y-1 py-3.5">
                  <span className="flex items-center gap-2">
                    <b className="min-w-0 flex-1 truncate text-[15px] font-semibold">{noteTitle(n)}</b>
                    {n.drawings > 0 && (
                      <span className="shrink-0 rounded-md bg-blush px-1.5 py-0.5 text-[11px] font-semibold text-sub">✎ 그림 {n.drawings}</span>
                    )}
                  </span>
                  {preview && <span className="line-clamp-2 block text-[13px] text-sub">{preview}</span>}
                  <span className="num block text-[12px] text-faint">
                    {dateTimeLabel(n.updatedAt)}
                    {n.updatedBy && ` · ${n.updatedBy}`}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
