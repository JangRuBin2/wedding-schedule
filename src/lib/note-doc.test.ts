import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanDrawing, DRAW_H, DRAW_H_MAX, noteTitle, notePreview, parseNoteDoc, PEN_COLORS, strokeHit, strokePath } from "./note-doc";

const doc = (...content: object[]) => JSON.stringify({ type: "doc", content });
const p = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });

test("메모 본문: 글·체크리스트·그림을 받고 미리보기 글과 그림 수를 뽑음", () => {
  const r = parseNoteDoc(
    doc(
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "드레스 투어" }] },
      p("  업체에 물어볼 것 "),
      {
        type: "taskList",
        content: [{ type: "taskItem", attrs: { checked: true }, content: [p("피팅비")] }],
      },
      { type: "drawing", attrs: { h: 700, strokes: [{ c: PEN_COLORS[1].color, s: 12, p: [10, 10, 50, 20, 20, 50] }] } },
    ),
  );
  assert.ok(r.ok);
  assert.equal(r.text, "드레스 투어\n업체에 물어볼 것\n피팅비");
  assert.equal(r.drawings, 1);
});

test("메모 본문: 스키마에 없는 블록·문서가 아닌 값은 거절", () => {
  assert.equal(parseNoteDoc(doc({ type: "image", attrs: { src: "x" } })).ok, false);
  assert.equal(parseNoteDoc(JSON.stringify({ type: "paragraph" })).ok, false);
  assert.equal(parseNoteDoc("null").ok, false);
  assert.equal(parseNoteDoc("hello").ok, false);
  assert.equal(parseNoteDoc(undefined as unknown as string).ok, false);
  // 링크는 스키마에서 뺐음 (보기 화면에 javascript: 주소가 나가지 않게)
  assert.equal(parseNoteDoc(doc({ type: "paragraph", content: [{ type: "text", text: "a", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] })).ok, false);
});

test("그림 정리: 모르는 색·굵기는 기본값, 좌표·높이는 판 안으로, 망가진 획은 버림", () => {
  const d = cleanDrawing({ h: 99999, strokes: [{ c: "red; x", s: 3, p: [-5, 99999, 500, 1, 2] }, { c: "#000", p: [] }, "junk"] });
  assert.equal(d.h, DRAW_H_MAX);
  assert.equal(d.strokes.length, 1);
  assert.deepEqual(d.strokes[0], { c: PEN_COLORS[0].color, s: 12, p: [0, DRAW_H_MAX, 100] });
  assert.equal(cleanDrawing(undefined).h, DRAW_H);
  assert.deepEqual(cleanDrawing({ strokes: [{ c: PEN_COLORS[2].color, s: 6, p: [1, 1, 50], r: 1 }] }).strokes[0].r, 1);
});

test("그림: 획 path 와 지우개 닿기", () => {
  const s = { c: PEN_COLORS[0].color, s: 12, p: [100, 100, 50, 300, 100, 50] };
  assert.match(strokePath(s), /^M[\d.]+,[\d.]+ Q.*Z$/);
  assert.ok(strokeHit(s, 200, 105, 5)); // 두 점 사이 선분 위
  assert.ok(!strokeHit(s, 200, 150, 5));
  assert.ok(strokeHit({ ...s, p: [50, 50, 50] }, 55, 55, 5)); // 점 하나짜리 획
});

test("목록 제목·미리보기", () => {
  assert.equal(noteTitle({ title: "", text: "첫 줄\n둘째 줄", drawings: 0 }), "첫 줄");
  assert.equal(notePreview({ title: "", text: "첫 줄\n둘째 줄" }), "둘째 줄");
  assert.equal(noteTitle({ title: "제목", text: "본문", drawings: 0 }), "제목");
  assert.equal(notePreview({ title: "제목", text: "본문" }), "본문");
  assert.equal(noteTitle({ title: "", text: "", drawings: 2 }), "그림 메모");
});
