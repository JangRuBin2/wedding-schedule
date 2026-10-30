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
