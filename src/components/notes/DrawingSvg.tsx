import { DRAW_W, strokePath, type Drawing } from "@/lib/note-doc";

/** 손그림 보기 (서버·브라우저 둘 다). 화면 폭에 맞춰 늘고 줄어듦. 바탕은 테마와 상관없이 밝은 종이 */
export function DrawingSvg({ drawing, className = "", label = "손그림" }: { drawing: Drawing; className?: string; label?: string }) {
  return (
    <svg
      viewBox={`0 0 ${DRAW_W} ${drawing.h}`}
      role="img"
      aria-label={label}
      className={`draw-paper block h-auto w-full ${className}`}
    >
      {drawing.strokes.map((s, i) => (
        <path key={i} d={strokePath(s)} fill={s.c} />
      ))}
    </svg>
  );
}
