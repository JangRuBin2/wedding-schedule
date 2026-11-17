/**
 * 개발자에게 커피 한 잔 (후원) 안내 규칙. DB 에 안 닿는 순수 함수라 테스트로 확인.
 * 열심히 쓰는 사람에게만, 가끔, 홈에서만 띄움. 거절은 바로 존중 ('나중에' 30일, '다시 보지 않기' 영원히)
 */
export const SUPPORT_RULES = {
  /** 가입하고 이만큼 지난 뒤부터 */
  minDaysSinceSignup: 14,
  /** 앱을 쓴 날 수 */
  minActiveDays: 5,
  /** 끝낸 일 (완료한 이벤트·할 일 + 결제 완료) */
  minDone: 10,
  laterDays: 30,
  afterSupportDays: 180,
} as const;

const DAY = 86_400_000;

export type SupportState = {
  createdAt: Date;
  activeDays: number;
  supportOptOut: boolean;
  supportSnooze: Date | null;
};

export function shouldAskSupport(u: SupportState, doneCount: number, now = new Date()): boolean {
  if (u.supportOptOut) return false;
  if (u.supportSnooze && u.supportSnooze > now) return false;
  if (now.getTime() - u.createdAt.getTime() < SUPPORT_RULES.minDaysSinceSignup * DAY) return false;
  if (u.activeDays < SUPPORT_RULES.minActiveDays) return false;
  return doneCount >= SUPPORT_RULES.minDone;
}

/** 버튼에 따라 다음 상태 */
export function supportAnswer(kind: "later" | "never" | "supported", now = new Date()) {
  if (kind === "never") return { supportOptOut: true };
  const days = kind === "later" ? SUPPORT_RULES.laterDays : SUPPORT_RULES.afterSupportDays;
  return { supportSnooze: new Date(now.getTime() + days * DAY) };
}
