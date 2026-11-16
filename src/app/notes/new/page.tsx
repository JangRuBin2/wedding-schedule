import { NoteEditor } from "@/components/notes/NoteEditor";
import { WriteHeader } from "@/components/WriteHeader";

/** 새 메모 (작성 화면) */
export default function NewNotePage() {
  return (
    <main className="space-y-5">
      <WriteHeader back="/notes" backLabel="취소" title="새 메모" sub="글은 위 도구 막대로 꾸미고, '그리기'를 누르면 손으로 그린 그림을 넣을 수 있어요" />
      <NoteEditor />
    </main>
  );
}
