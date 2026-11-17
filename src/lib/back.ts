/**
 * 작성 화면에서 저장한 뒤 돌아갈 주소. 우리 사이트 안 경로만 받음.
 * 브라우저가 주소를 푸는 방식 그대로 풀어 본 뒤(탭·줄바꿈 제거, \ → / 등) 다른 사이트로 가면 fallback
 * (예: "//evil.com", "/\\evil.com", "/\t/evil.com")
 */
export function safeBack(v: unknown, fallback: string) {
  if (typeof v !== "string" || !v.startsWith("/") || /[\u0000-\u001f\u007f\\]/.test(v)) return fallback;
  try {
    const base = "https://bomnal.invalid";
    const u = new URL(v, base);
    return u.origin === base ? `${u.pathname}${u.search}${u.hash}` : fallback;
  } catch {
    return fallback;
  }
}
