import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import type { JSONContent } from "@tiptap/core";
import { cleanDrawing, noteExtensions } from "@/lib/note-doc";
import { DrawingSvg } from "./DrawingSvg";

/**
 * 메모 보기 (서버에서 그림). 에디터를 띄우지 않고 저장된 문서를 그대로 HTML 로.
 * 체크리스트 칸은 보기 화면에선 표시만 (고치기는 수정 화면에서)
 */
export function NoteBody({ content }: { content: JSONContent }) {
  return (
    <div className="note-body">
      {renderToReactElement({
        content,
        extensions: noteExtensions(),
        options: {
          nodeMapping: {
            drawing: ({ node }) => (
              <div className="note-drawing">
                <DrawingSvg drawing={cleanDrawing(node.attrs)} className="rounded-xl border border-line" />
              </div>
            ),
            taskList: ({ children }) => <ul data-type="taskList">{children}</ul>,
            taskItem: ({ node, children }) => (
              <li data-type="taskItem" data-checked={node.attrs.checked ? "true" : "false"}>
                <span className="task-box" aria-label={node.attrs.checked ? "끝남" : "안 끝남"} role="img" />
                <div>{children}</div>
              </li>
            ),
          },
        },
      })}
    </div>
  );
}
