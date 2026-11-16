import { getSchema, mergeAttributes, Node, type Extensions, type JSONContent } from "@tiptap/core";
import { Node as PMNode } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { getStroke } from "perfect-freehand";

/**
 * 메모 본문 (Tiptap 문서). 에디터·저장 검사·보기 화면이 같은 스키마를 씀.
 * 손그림은 'drawing' 블록 하나에 획 목록을 attrs 로 담음 (그림 파일이 아니라 좌표라서 작고, 어느 화면 폭에서나 선명)
 * 서버에서도 import 하므로 React·DOM 에 기대는 건 두지 않음 (에디터 화면은 components/notes 에서 확장)
 */

// ── 손그림 ──

/** 그림판 논리 폭. 좌표는 0..W, 0..h 정수 (화면 폭에 맞춰 늘고 줄어듦) */
export const DRAW_W = 1000;
export const DRAW_H = 700;
export const DRAW_H_STEP = 350;
export const DRAW_H_MAX = 3500;

/** 펜 색. 그림판 바탕은 테마와 상관없이 늘 밝은 종이색이라 어두운 테마에서도 그대로 보임 */
export const PEN_COLORS = [
  { color: "#2f2a2c", label: "검정" },
  { color: "#d0505a", label: "빨강" },
  { color: "#3b6fc4", label: "파랑" },
  { color: "#3f8f5f", label: "초록" },
  { color: "#c27a1c", label: "주황" },
  { color: "#a06cc2", label: "보라" },
] as const;
export const PEN_SIZES = [
  { size: 6, label: "가늘게" },
  { size: 12, label: "보통" },
  { size: 24, label: "굵게" },
] as const;

/** 한 획. p = [x, y, 압력(0~100), x, y, 압력, …] 정수. r = 펜 압력이 진짜 값(애플펜슬 등)이면 1, 아니면 속도로 흉내 */
export type Stroke = { c: string; s: number; p: number[]; r?: 1 };
export type Drawing = { h: number; strokes: Stroke[] };

const MAX_STROKES = 2000;
const MAX_POINTS = 4000; // 한 획
const MAX_DRAWINGS = 30; // 메모 하나
const MAX_TOTAL_POINTS = 200_000; // 메모 하나 (JSON 으로 대략 2MB 이하)

const clampInt = (v: unknown, lo: number, hi: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;
};
const COLORS = new Set<string>(PEN_COLORS.map((c) => c.color));
const SIZES = new Set<number>(PEN_SIZES.map((s) => s.size));

/** 저장 전에 그림 attrs 를 정리: 모르는 색·굵기는 기본값, 좌표는 판 안으로, 너무 많으면 자름 */
export function cleanDrawing(raw: unknown): Drawing {
  const o = (raw && typeof raw === "object" ? raw : {}) as { h?: unknown; strokes?: unknown };
  const h = clampInt(o.h, DRAW_H, DRAW_H_MAX);
  const list = Array.isArray(o.strokes) ? o.strokes.slice(0, MAX_STROKES) : [];
  const strokes: Stroke[] = [];
  for (const s of list) {
    if (!s || typeof s !== "object") continue;
    const { c, s: size, p, r } = s as Record<string, unknown>;
    if (!Array.isArray(p) || p.length < 3) continue;
    const pts: number[] = [];
    for (let i = 0; i + 2 < p.length && pts.length < MAX_POINTS * 3; i += 3) {
      pts.push(clampInt(p[i], 0, DRAW_W), clampInt(p[i + 1], 0, h), clampInt(p[i + 2], 0, 100));
    }
    strokes.push({
      c: typeof c === "string" && COLORS.has(c) ? c : PEN_COLORS[0].color,
      s: SIZES.has(Number(size)) ? Number(size) : PEN_SIZES[1].size,
      p: pts,
      ...(r === 1 ? { r: 1 as const } : {}),
    });
  }
  return { h, strokes };
}

/** perfect-freehand 윤곽선 → SVG path (곡선으로 이음) */
function outlineToPath(pts: number[][]): string {
  if (pts.length < 2) return "";
  const avg = (a: number, b: number) => ((a + b) / 2).toFixed(1);
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)} Q`;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    d += `${x0.toFixed(1)},${y0.toFixed(1)} ${avg(x0, x1)},${avg(y0, y1)} `;
  }
  return d + "Z";
}

/** 한 획을 채워 그릴 SVG path. 그리는 중(last=false)에도 같은 함수로 미리 보여 줌 */
export function strokePath(s: Stroke, last = true): string {
  const input: number[][] = [];
  for (let i = 0; i + 2 < s.p.length; i += 3) input.push([s.p[i], s.p[i + 1], s.p[i + 2] / 100]);
  if (input.length === 0) return "";
  const outline = getStroke(input, {
    size: s.s,
    thinning: s.r ? 0.6 : 0.5,
    smoothing: 0.5,
    streamline: 0.45,
    simulatePressure: !s.r,
    last,
  });
  return outlineToPath(outline);
}

/** 지우개: (x, y) 에서 반지름 안에 닿는 획인지 (점 사이 선분까지 봄) */
export function strokeHit(s: Stroke, x: number, y: number, radius: number): boolean {
  const r = radius + s.s / 2;
  const r2 = r * r;
  const p = s.p;
  if (p.length === 3) return (p[0] - x) ** 2 + (p[1] - y) ** 2 <= r2;
  for (let i = 0; i + 5 < p.length; i += 3) {
    const ax = p[i], ay = p[i + 1], bx = p[i + 3], by = p[i + 4];
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2)) : 0;
    if ((ax + t * dx - x) ** 2 + (ay + t * dy - y) ** 2 <= r2) return true;
  }
  return false;
}

/** 손그림 블록. attrs 는 JSON 그대로 (HTML 로 복사·붙여넣기할 땐 data-drawing 에 담음) */
export const DrawingNode = Node.create({
  name: "drawing",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      h: { default: DRAW_H, rendered: false },
      strokes: { default: [], rendered: false },
    };
  },
  parseHTML() {
    return [
      {
        tag: "div[data-drawing]",
        getAttrs: (el) => {
          try {
            return cleanDrawing(JSON.parse((el as HTMLElement).getAttribute("data-drawing") ?? ""));
          } catch {
            return false;
          }
        },
      },
    ];
  },
  renderHTML({ node, HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-drawing": JSON.stringify({ h: node.attrs.h, strokes: node.attrs.strokes }) })];
  },
});

/** 메모 스키마. 링크·코드는 뺌 (링크는 주소 검사 없이 보기 화면에 그대로 나가지 않게) */
export const noteExtensions = (drawing: Extensions[number] = DrawingNode): Extensions => [
  StarterKit.configure({ heading: { levels: [2, 3] }, link: false, code: false, codeBlock: false }),
  TaskList,
  TaskItem.configure({ nested: true }),
  drawing,
];

// ── 저장 검사 ──

export const MAX_NOTE_JSON = 3_000_000;
export const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

let schema: ReturnType<typeof getSchema> | null = null;
const noteSchema = () => (schema ??= getSchema(noteExtensions()));

export type ParsedNote = { ok: true; doc: JSONContent; text: string; drawings: number } | { ok: false; error: string };

/**
 * 브라우저에서 온 본문(JSON 문자열)을 검사. 에디터 attrs 는 일반 객체가 아니라서 서버 액션에 객체로 넘기면
 * 값이 빠지므로 문자열로 받음.: 스키마에 없는 블록·잘못된 구조는 거절, 그림 attrs 는 정리.
 * 목록 미리보기용 글과 그림 수도 같이 뽑음
 */
export function parseNoteDoc(body: string): ParsedNote {
  if (typeof body !== "string") return { ok: false, error: "메모 내용을 읽지 못했어요" };
  if (body.length > MAX_NOTE_JSON) return { ok: false, error: "메모가 너무 커요. 그림을 나눠서 다른 메모에 그려 주세요" };
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    return { ok: false, error: "메모 내용을 읽지 못했어요" };
  }

  let drawings = 0;
  let points = 0;
  const clean = (n: unknown): JSONContent => {
    const node = (n && typeof n === "object" ? n : {}) as JSONContent;
    if (node.type === "drawing") {
      drawings++;
      const d = cleanDrawing(node.attrs);
      points += d.strokes.reduce((k, s) => k + s.p.length / 3, 0);
      return { type: "drawing", attrs: d };
    }
    return Array.isArray(node.content) ? { ...node, content: node.content.map(clean) } : node;
  };
  const json = clean(raw);
  if (json.type !== "doc") return { ok: false, error: "메모 내용을 읽지 못했어요" };
  if (drawings > MAX_DRAWINGS) return { ok: false, error: `그림은 메모 하나에 ${MAX_DRAWINGS}개까지예요` };
  if (points > MAX_TOTAL_POINTS) return { ok: false, error: "그림이 너무 많아요. 다른 메모에 나눠서 그려 주세요" };

  let doc: PMNode;
  try {
    doc = PMNode.fromJSON(noteSchema(), json);
    doc.check();
  } catch {
    return { ok: false, error: "메모 내용을 읽지 못했어요" };
  }
  const text = doc
    .textBetween(0, doc.content.size, "\n", "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, 2000);
  return { ok: true, doc: doc.toJSON() as JSONContent, text, drawings };
}

/** 목록에 보일 제목: 적은 제목, 없으면 본문 첫 줄, 그것도 없으면 그림 메모 */
export function noteTitle(n: { title: string; text: string; drawings: number }): string {
  return n.title || n.text.split("\n")[0]?.slice(0, 60) || (n.drawings ? "그림 메모" : "빈 메모");
}

/** 목록 미리보기: 제목으로 쓴 첫 줄은 빼고 나머지 글 */
export function notePreview(n: { title: string; text: string }): string {
  const lines = n.text.split("\n");
  return (n.title ? lines : lines.slice(1)).join(" ").slice(0, 140);
}
