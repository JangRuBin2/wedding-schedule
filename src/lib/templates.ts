/**
 * 기본 20개 이벤트. 순서·이름·추천 일정(offset, 결혼식 날짜 기준 일)은 모아봄 결혼준비와 같고 카테고리만 붙였음.
 * 카테고리는 기본 6개(DEFAULT_CATEGORIES) 중 하나
 * offset은 '추천 일정 채우기'를 할 때만 씀
 */
export const EVENT_TEMPLATES: {
  key: string;
  order: number;
  title: string;
  category: string;
  offset: number;
  hint?: string;
  memo?: string;
}[] = [
  { key: "s01", order: 1, title: "양가 인사", category: "기타", offset: -365 },
  { key: "s02", order: 2, title: "택일 → 웨딩홀 계약", category: "예식", offset: -330, hint: "하객 수가 어느 정도인지 먼저 확인해 주세요 (보증인원)" },
  { key: "s03", order: 3, title: "스드메·본식 스냅 계약", category: "스드메", offset: -300 },
  { key: "s04", order: 4, title: "예물", category: "예물·예단", offset: -240 },
  { key: "s05", order: 5, title: "헤어변형·헬퍼 관련", category: "스드메", offset: -210 },
  { key: "s06", order: 6, title: "스튜디오 촬영", category: "스드메", offset: -150 },
  { key: "s07", order: 7, title: "신혼여행 예약", category: "신혼여행", offset: -150 },
  { key: "s08", order: 8, title: "식전 관리", category: "기타", offset: -120 },
  { key: "s09", order: 9, title: "상견례", category: "기타", offset: -120 },
  { key: "s10", order: 10, title: "하객 리스트 작성", category: "예식", offset: -100, hint: "하객 수로 청첩장 수를 정해요" },
  { key: "s11", order: 11, title: "청첩장", category: "예식", offset: -90 },
  { key: "s12", order: 12, title: "혼주 양장·한복·헤메", category: "예물·예단", offset: -60 },
  { key: "s13", order: 13, title: "청모 + 모청 전달", category: "예식", offset: -45, memo: "청첩장 모임 + 모바일 청첩장" },
  { key: "s14", order: 14, title: "사회자 & 축가 준비", category: "예식", offset: -45 },
  { key: "s15", order: 15, title: "결혼식순 정리", category: "예식", offset: -30 },
  { key: "s16", order: 16, title: "부케·식전 영상 등 준비", category: "예식", offset: -30 },
  { key: "s17", order: 17, title: "축의대 준비", category: "예식", offset: -14 },
  { key: "s18", order: 18, title: "결혼식 당일", category: "예식", offset: 0 },
  { key: "s19", order: 19, title: "신혼여행", category: "신혼여행", offset: 1 },
  { key: "s20", order: 20, title: "양가 인사", category: "기타", offset: 14 },
];

/** 이벤트별 추천 할 일. '추천 할 일 넣기'나 할 일 추가 화면의 칩으로만 들어감 */
export const SUGGESTED_TASKS: { eventKey: string; section: string; content: string }[] = [
  ...(
    [
      ["s09", "상견례", ["장소 예약", "양가 일정 맞추기", "선물 준비", "대화 주제·호칭 정리"]],
      ["s06", "드레스 피팅", ["드레스 투어 예약", "촬영 드레스 고르기", "본식 드레스 가봉", "2부 드레스 고르기"]],
      ["s06", "스튜디오 촬영", ["촬영 콘셉트 정하기", "소품 준비", "원본 받기", "앨범 셀렉"]],
      ["s18", "본식", ["식순 최종 확인", "축의대 담당 정하기", "사례비 봉투", "폐백 여부", "BGM 전달"]],
      ["s08", "기타 관리 및 물품 구매", ["피부 관리", "웨딩슈즈", "속옷·소품"]],
      ["s19", "신혼여행", ["항공권", "숙소", "환전·로밍", "여행자 보험"]],
    ] as const
  ).flatMap(([eventKey, section, items]) => items.map((content) => ({ eventKey, section, content }))),
  // 결혼과 같이 챙기면 돈이 되는 행정
  ...(
    [
      ["s02", "하객 수 대략 정하기 (웨딩홀 보증인원·청첩장 수 기준)"],
      ["s03", "계약 전에 추가금 목록 받기 (원본·수정본·헬퍼비·연출료)"],
      ["s07", "두 사람 여권 만료일 확인"],
      ["s07", "회사 경조휴가 일수 확인"],
      ["s10", "혼인신고 시기 정하기 (결혼세액공제·신혼부부 대출·청약 자격)"],
      ["s10", "신혼집 대출 비교 (버팀목·디딤돌 요건, 신용점수 확인)"],
      ["s14", "사회자·축가·축의대 사례 봉투 준비"],
      ["s18", "축의금 명단·금액 당일 정리"],
      ["s20", "전입신고·확정일자 (이사 당일)"],
      ["s20", "연말정산: 결혼세액공제, 의료비는 소득 적은 쪽으로"],
    ] as const
  ).map(([eventKey, content]) => ({ eventKey, section: "행정·혜택", content })),
];

export const ADMIN_SECTION = "행정·혜택";

export function suggestionsFor(templateKey: string | null, have: { content: string }[] = []) {
  if (!templateKey) return [];
  const taken = new Set(have.map((t) => t.content));
  return SUGGESTED_TASKS.filter((t) => t.eventKey === templateKey && !taken.has(t.content));
}

export const templateOffset = (key: string | null) => EVENT_TEMPLATES.find((t) => t.key === key)?.offset;
