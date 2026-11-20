/**
 * 이벤트 카테고리 기본값과 색 팔레트. 실제 목록은 DB(Category)에 있고 처음 열 때 기본값으로 채움.
 * DB에 안 닿는 상수만 둬서 클라이언트 컴포넌트에서도 import 가능
 */
export const DEFAULT_CATEGORIES = [
  { name: "예식", color: "#d98f98" },
  { name: "스드메", color: "#a99bd0" },
  { name: "예물·예단", color: "#d4ac7e" },
  { name: "신혼여행", color: "#86aecf" },
  { name: "신혼집", color: "#8fb38a" },
  { name: "기타", color: "#b3a9a6" },
] as const;

/** 지울 수 없는 카테고리. 지운 카테고리의 이벤트가 여기로 옮겨짐 */
export const FALLBACK_CATEGORY = "기타";

/** 카테고리 색 고르기. 차분한 파스텔 (막대·점은 이 색, 칸 채우기는 연하게) */
export const COLOR_PALETTE = [
  "#d98f98",
  "#e8a07e",
  "#d4ac7e",
  "#c9b25f",
  "#8fb38a",
  "#6fae9f",
  "#86aecf",
  "#8b9fd6",
  "#a99bd0",
  "#c79ac4",
  "#a88f7f",
  "#b3a9a6",
];

/** 예전(파랑·보라 테마) 팔레트 → 새 팔레트. 이미 저장된 카테고리 색을 한 번 바꿀 때 씀 */
export const OLD_COLORS: Record<string, string> = {
  "#7b8cff": "#d98f98",
  "#f08cbd": "#a99bd0",
  "#f5b971": "#d4ac7e",
  "#4fc3b8": "#86aecf",
  "#a78bfa": "#8fb38a",
  "#9ca3af": "#b3a9a6",
  "#e5544b": "#e8a07e",
  "#4f9a5a": "#6fae9f",
  "#2f86c4": "#8b9fd6",
  "#cfa125": "#c9b25f",
  "#9a6b4b": "#a88f7f",
  "#23a094": "#c79ac4",
};

/** 막대 색을 칸 채우기용으로 연하게 (#rrggbb + 알파) */
export const soft = (hex: string, alpha = 0.22) =>
  `${hex}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")}`;

export type CategoryInfo = { name: string; color: string };

/** 이름 → 색. 목록에 없으면(지워진 이름 등) 회색 */
export const colorOf = (categories: readonly CategoryInfo[], name: string) =>
  categories.find((c) => c.name === name)?.color ?? "#b3a9a6";

/** 이벤트 만들기 자동완성 */
export const EVENT_SUGGESTIONS = [
  "드레스 투어",
  "상견례",
  "청첩장",
  "웨딩홀 투어",
  "본식 스냅 계약",
  "예물 보러 가기",
  "한복 맞추기",
  "신혼집 보러 가기",
  "가전 고르기",
  "신혼여행 예약",
  "웨딩 촬영",
  "부케 고르기",
];

/** 결제 이름 추천 */
export const DUE_SUGGESTIONS = ["계약금", "중도금", "잔금", "추가금", "헬퍼비"];

/** 지출 기록 항목 추천 */
/** 결제 한 건의 이름. 제목은 '항목 + 이름'(헤어 메이크업 계약금), '전액'이면 항목 이름 그대로 */
export const PART_LABELS = ["계약금", "중도금", "잔금", "추가금", "전액"] as const;
/**
 * '헤어 메이크업 계약금' → { base: '헤어 메이크업', label: '계약금' }. 띄어 쓰지 않은 '스튜디오잔금'도 나눔.
 * 결제 이름으로 안 끝나거나 이름만 있으면('잔금') 전액
 */
export function splitTitle(title: string): { base: string; label: string } {
  const t = title.trim();
  for (const l of PART_LABELS) {
    if (l === "전액" || !t.endsWith(l)) continue;
    const base = t.slice(0, -l.length).trim();
    if (base) return { base, label: l };
  }
  return { base: t, label: "전액" };
}
export const joinTitle = (base: string, label: string) => (label === "전액" ? base : `${base} ${label}`);
/** 저장된 첨부 하나 (작성 화면에서 보여 주고 지우기) */
export type ReceiptInfo = { id: string; width: number; height: number; mime: string; name: string | null; size: number | null };
/** 작성·수정 화면의 결제 칸 하나. id 가 있으면 이미 저장된 건. 메모·첨부는 결제마다 */
export type ExpensePart = { key: number; id?: string; label: string; paid: boolean; amount: string; date: string; memo: string; receipts: ReceiptInfo[] };

export const EXPENSE_SUGGESTIONS = ["계약금", "잔금", "추가금", "헬퍼비", "부케", "식대", "청첩장 인쇄", "답례품", "교통비"];

/** 일정 종류 색. 카테고리 색(파스텔)과 헷갈리지 않게 진하고 서로 확실히 다른 세 색 */
export const KINDS = {
  event: { label: "이벤트", color: "#c95d72" },
  task: { label: "할 일", color: "#3f8f5f" },
  due: { label: "결제", color: "#c27a1c" },
} as const;
export type Kind = keyof typeof KINDS;
