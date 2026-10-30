/**
 * 이벤트 카테고리. 이름과 색은 모아봄 예산 구분에서 가져오고 금액 비율은 뺐음.
 * DB에 안 닿는 상수만 둬서 클라이언트 컴포넌트에서도 import 가능
 */
export const CATEGORIES = [
  { name: "예식", color: "#7b8cff", hint: "웨딩홀, 청첩장, 사회·축가, 식순" },
  { name: "스드메", color: "#f08cbd", hint: "스튜디오·드레스·메이크업, 본식 스냅" },
  { name: "예물·예단", color: "#f5b971", hint: "웨딩밴드, 예복, 한복, 혼주 준비" },
  { name: "신혼여행", color: "#4fc3b8", hint: "항공, 숙소, 여권" },
  { name: "신혼집", color: "#a78bfa", hint: "집 구하기, 가전·가구, 이사" },
  { name: "기타", color: "#9ca3af", hint: "양가 인사, 상견례, 그 밖의 준비" },
] as const;

export type Category = (typeof CATEGORIES)[number]["name"];

export const CATEGORY_NAMES: readonly string[] = CATEGORIES.map((c) => c.name);

export const categoryColor = (name: string) => CATEGORIES.find((c) => c.name === name)?.color ?? "#9ca3af";

export const toCategory = (v: unknown): Category =>
  (CATEGORY_NAMES.includes(String(v)) ? String(v) : "기타") as Category;

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
