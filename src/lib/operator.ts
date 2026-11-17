/**
 * 운영자 정보 (개인정보처리방침·이용약관에 나옴). 스토어에 내기 전에 실제 값으로 채우기.
 * 비어 있으면 화면에 '준비 중'으로 보임
 */
export const OPERATOR = {
  /** 운영자(개인 또는 사업자) 이름 */
  name: "",
  /** 문의·개인정보 보호책임자 연락 이메일 */
  email: "",
  /**
   * 후원(커피 한 잔) 받을 주소. 카카오페이 송금코드 링크 등 https 주소. 비어 있으면 후원 메뉴·안내를 아예 안 보여 줌.
   * 카카오톡 → 더보기 → 오른쪽 위 스캐너 → 송금코드 → 링크 복사
   */
  supportUrl: "https://qr.kakaopay.com/281006011133733132006744",
  /** 시행일 */
  effective: "2026-11-17",
};
export const orPending = (v: string) => v || "(준비 중)";

/** 후원 주소가 제대로 들어 있을 때만 (https) */
export const supportUrl = () => (/^https:\/\/[^\s]+$/.test(OPERATOR.supportUrl) ? OPERATOR.supportUrl : null);
