/**
 * 이벤트 카테고리 기본값과 색 팔레트. 실제 목록은 DB(Category)에 있고 처음 열 때 기본값으로 채움.
 * DB에 안 닿는 상수만 둬서 클라이언트 컴포넌트에서도 import 가능
 */
export const DEFAULT_CATEGORIES = [
  { name: "예식", color: "#7b8cff" },
  { name: "스드메", color: "#f08cbd" },
  { name: "예물·예단", color: "#f5b971" },
  { name: "신혼여행", color: "#4fc3b8" },
  { name: "신혼집", color: "#a78bfa" },
  { name: "기타", color: "#9ca3af" },
] as const;

/** 지울 수 없는 카테고리. 지운 카테고리의 이벤트가 여기로 옮겨짐 */
export const FALLBACK_CATEGORY = "기타";

/** 카테고리 색 고르기 (라이트·다크 둘 다 읽히는 중간 톤) */
export const COLOR_PALETTE = [
  "#7b8cff",
  "#f08cbd",
  "#f5b971",
  "#4fc3b8",
  "#a78bfa",
  "#e5544b",
  "#4f9a5a",
  "#2f86c4",
  "#cfa125",
  "#9a6b4b",
  "#23a094",
  "#9ca3af",
];

export type CategoryInfo = { name: string; color: string };

/** 이름 → 색. 목록에 없으면(지워진 이름 등) 회색 */
export const colorOf = (categories: readonly CategoryInfo[], name: string) =>
  categories.find((c) => c.name === name)?.color ?? "#9ca3af";

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

/** 돈 낼 날 이름 추천 */
export const DUE_SUGGESTIONS = ["계약금", "중도금", "잔금", "추가금", "헬퍼비"];
