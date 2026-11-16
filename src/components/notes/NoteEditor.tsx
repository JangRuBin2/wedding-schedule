"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
  useEditorState,
  type Editor,
  type JSONContent,
  type NodeViewProps,
} from "@tiptap/react";
import { Placeholder } from "@tiptap/extensions";
import { saveNote } from "@/app/actions";
import { DRAW_H, DrawingNode, EMPTY_DOC, MAX_NOTE_JSON, noteExtensions, type Drawing } from "@/lib/note-doc";
import { DrawingPad } from "./DrawingPad";
import { DrawingSvg } from "./DrawingSvg";

/** 에디터 안 손그림 블록: 그림을 보여 주고, 누르면 그리기 모드로 고침 */
function DrawingView({ node, updateAttributes, deleteNode, selected, editor }: NodeViewProps) {
  const [open, setOpen] = useState(false);
  const drawing = { h: node.attrs.h as number, strokes: node.attrs.strokes as Drawing["strokes"] };
  return (
    <NodeViewWrapper className="note-drawing" data-drag-handle>
      <button
        type="button"
        onClick={() => editor.isEditable && setOpen(true)}
        className={`relative block w-full overflow-hidden rounded-xl border text-left ${selected ? "border-save ring-2 ring-save/40" : "border-line"}`}
        aria-label="그림 고치기"
      >
        <DrawingSvg drawing={drawing} />
        <span className="absolute right-2 bottom-2 rounded-lg bg-black/55 px-2 py-1 text-[11px] font-semibold text-white">✎ 그림 고치기</span>
      </button>
      {open && (
        <DrawingPad
          initial={drawing}
          onCancel={() => setOpen(false)}
          onDone={(d) => {
            setOpen(false);
            if (!d.strokes.length) deleteNode();
            else if (d !== drawing) updateAttributes(d);
          }}
          onDelete={() => {
            setOpen(false);
            deleteNode();
          }}
        />
      )}
    </NodeViewWrapper>
  );
}

const EditableDrawing = DrawingNode.extend({
  addNodeView() {
    return ReactNodeViewRenderer(DrawingView);
  },
});

/**
 * 메모 쓰기·고치기 (작성 화면). 위 도구 막대로 글 꾸미기, '그리기'로 손그림 블록을 넣음.
 * 저장을 눌러야 서버에 남고, 저장 안 하고 나가려 하면 브라우저가 한 번 물어봄
 */
export function NoteEditor({ id, title: initialTitle = "", content }: { id?: string; title?: string; content?: JSONContent }) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newDrawing, setNewDrawing] = useState(false);

  const editor = useEditor({
    extensions: [
      ...noteExtensions(EditableDrawing),
      Placeholder.configure({ placeholder: "적고 싶은 걸 자유롭게. 위 도구로 목록·체크리스트를 만들고, ✎ 그리기로 그림도 넣을 수 있어요" }),
    ],
    content: content ?? EMPTY_DOC,
    immediatelyRender: false,
    autofocus: id ? false : "end",
    editorProps: { attributes: { class: "note-body note-editable", "aria-label": "메모 내용" } },
    onUpdate: () => setDirty(true),
  });

  // 저장 안 한 채로 새로고침·닫기 하면 확인
  const leaveGuard = useRef(false);
  leaveGuard.current = dirty && !saving;
  useEffect(() => {
    const onLeave = (e: BeforeUnloadEvent) => {
      if (leaveGuard.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, []);

  const save = async () => {
    if (!editor || saving) return;
    setError("");
    const doc = JSON.stringify(editor.getJSON());
    if (doc.length > MAX_NOTE_JSON) {
      setError("메모가 너무 커요. 그림을 나눠서 다른 메모에 그려 주세요");
      return;
    }
    setSaving(true);
    try {
      const r = await saveNote({ id, title, content: doc });
      if (!r.ok) throw new Error(r.error);
      setDirty(false);
      router.replace(`/notes/${r.id}`);
      router.refresh();
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error && e.message ? e.message : "저장하지 못했어요. 다시 시도해 주세요");
    }
  };

  return (
    <div className="space-y-4">
      <div className="card space-y-3 !p-0">
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setDirty(true);
          }}
          maxLength={80}
          placeholder="제목 (선택)"
          aria-label="제목"
          className="w-full rounded-t-[18px] bg-transparent px-[18px] pt-4 pb-1 text-[19px] font-bold outline-none placeholder:text-faint"
        />
        <Toolbar editor={editor} onDraw={() => setNewDrawing(true)} />
        <div className="min-h-[45dvh] px-[18px] pb-5">
          <EditorContent editor={editor} />
        </div>
      </div>

      {error && <p role="alert" className="text-[13px] font-semibold text-spend">{error}</p>}
      <button type="button" onClick={save} disabled={!editor || saving} aria-busy={saving} className="btn w-full disabled:opacity-60">
        {saving ? "저장 중…" : "저장"}
      </button>

      {newDrawing && (
        <DrawingPad
          initial={{ h: DRAW_H, strokes: [] }}
          onCancel={() => setNewDrawing(false)}
          onDone={(d) => {
            setNewDrawing(false);
            if (!editor || !d.strokes.length) return;
            // 커서 자리에 그림을 넣고, 이어서 글을 쓸 수 있게 아래에 빈 줄
            editor.chain().focus().insertContent([{ type: "drawing", attrs: d }, { type: "paragraph" }]).run();
          }}
        />
      )}
    </div>
  );
}

/** 글 꾸미기 도구 막대. 글을 쓰는 동안 화면 위에 붙어 있음 */
function Toolbar({ editor, onDraw }: { editor: Editor | null; onDraw: () => void }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            underline: e.isActive("underline"),
            strike: e.isActive("strike"),
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            task: e.isActive("taskList"),
            quote: e.isActive("blockquote"),
            canUndo: e.can().undo(),
            canRedo: e.can().redo(),
          }
        : null,
  });
  if (!editor || !s) return <div className="h-[46px] border-y border-line" />;
  const c = () => editor.chain().focus();
  return (
    <div
      className="sticky top-0 z-[5] flex items-center gap-0.5 overflow-x-auto border-y border-line bg-card/95 px-2 py-1 backdrop-blur md:top-[49px]"
      role="toolbar"
      aria-label="글 꾸미기"
    >
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onDraw}
        className="mr-1 flex shrink-0 items-center gap-1 rounded-xl bg-blush px-2.5 py-1.5 text-[13px] font-bold text-ink"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 20l4-1 10.5-10.5a2.1 2.1 0 0 0-3-3L5 16l-1 4z" />
        </svg>
        그리기
      </button>
      <Btn label="제목" active={s.h2} onClick={() => c().toggleHeading({ level: 2 }).run()}>
        <text x="12" y="17" textAnchor="middle" fontSize="14" fontWeight="800" fill="currentColor" stroke="none">T</text>
      </Btn>
      <Btn label="소제목" active={s.h3} onClick={() => c().toggleHeading({ level: 3 }).run()}>
        <text x="12" y="16.5" textAnchor="middle" fontSize="11" fontWeight="800" fill="currentColor" stroke="none">T</text>
      </Btn>
      <Btn label="굵게" active={s.bold} onClick={() => c().toggleBold().run()}>
        <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" strokeWidth="2.4" />
      </Btn>
      <Btn label="기울임" active={s.italic} onClick={() => c().toggleItalic().run()}>
        <path d="M14 5h-4M14 19h-4M13 5l-2 14" />
      </Btn>
      <Btn label="밑줄" active={s.underline} onClick={() => c().toggleUnderline().run()}>
        <path d="M7 4v6a5 5 0 0 0 10 0V4M5 20h14" />
      </Btn>
      <Btn label="취소선" active={s.strike} onClick={() => c().toggleStrike().run()}>
        <path d="M5 12h14M16 7.5C15.4 6 14 5 12 5c-2.5 0-4 1.3-4 3 0 1.3.8 2.2 2.4 2.8M8 16.5c.6 1.5 2 2.5 4 2.5 2.5 0 4-1.3 4-3" />
      </Btn>
      <Sep />
      <Btn label="체크리스트" active={s.task} onClick={() => c().toggleTaskList().run()}>
        <path d="M4 6.5l1.5 1.5 3-3M4 15.5l1.5 1.5 3-3M11.5 7h8.5M11.5 16h8.5" />
      </Btn>
      <Btn label="글머리 목록" active={s.bullet} onClick={() => c().toggleBulletList().run()}>
        <path d="M9 6h11M9 12h11M9 18h11" />
        <circle cx="4.5" cy="6" r="1" fill="currentColor" />
        <circle cx="4.5" cy="12" r="1" fill="currentColor" />
        <circle cx="4.5" cy="18" r="1" fill="currentColor" />
      </Btn>
      <Btn label="번호 목록" active={s.ordered} onClick={() => c().toggleOrderedList().run()}>
        <path d="M10 6h10M10 12h10M10 18h10M4 4.5h1.5V9M4 9h3M4 14.5c.5-.7 2.5-.9 2.5.6 0 1-2.5 2-2.5 3.4h3" />
      </Btn>
      <Btn label="인용" active={s.quote} onClick={() => c().toggleBlockquote().run()}>
        <path d="M5 5v14M9 8h10M9 12h10M9 16h6" />
      </Btn>
      <Btn label="구분선" onClick={() => c().setHorizontalRule().run()}>
        <path d="M4 12h16" />
      </Btn>
      <Sep />
      <Btn label="되돌리기" disabled={!s.canUndo} onClick={() => c().undo().run()}>
        <path d="M9 7L4 12l5 5M4 12h11a5 5 0 0 1 0 10h-2" />
      </Btn>
      <Btn label="다시 하기" disabled={!s.canRedo} onClick={() => c().redo().run()}>
        <path d="M15 7l5 5-5 5M20 12H9a5 5 0 0 0 0 10h2" />
      </Btn>
    </div>
  );
}

const Sep = () => <span className="mx-1 h-5 w-px shrink-0 bg-line" aria-hidden />;

function Btn({
  children,
  label,
  onClick,
  active,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      // 누를 때 에디터 커서(선택)가 풀리지 않게
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl disabled:opacity-35 ${active ? "bg-save-soft text-ink" : "text-sub"}`}
    >
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
    </button>
  );
}
