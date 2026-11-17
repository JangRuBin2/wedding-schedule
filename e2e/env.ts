/**
 * E2E 환경. 테스트는 **전용 DB** 에 데이터를 만들어 쓴다 — 개발·운영 DB 를 건드리지 않게 여기서 막는다.
 *
 * - E2E_DATABASE_URL: 테스트 DB (기본 로컬 postgresql://dev:dev@localhost:5432/bomnal_e2e)
 *   DB 이름에 e2e 나 test 가 있어야 하고, localhost 가 아니면 E2E_ALLOW_REMOTE_DB=1 이 있어야 함
 * - E2E_BASE_URL: 이미 떠 있는 서버를 쓸 때 (없으면 3200 에 dev 서버를 띄움)
 * 앱은 카카오 로그인 모드로 띄우고(가짜 키), 로그인은 AUTH_SECRET 으로 서명한 세션 쿠키로 대신한다
 */
export const E2E_PORT = 3200;
export const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${E2E_PORT}`;
export const DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgresql://dev:dev@localhost:5432/bomnal_e2e";
export const AUTH_SECRET = process.env.E2E_AUTH_SECRET ?? "e2e-only-secret-not-for-production-0123456789";

export function assertSafeDatabase(url = DATABASE_URL) {
  const u = new URL(url);
  const name = u.pathname.slice(1);
  if (!/e2e|test/i.test(name)) throw new Error(`E2E DB 이름에 e2e/test 가 없어요 (${name}). 개발·운영 DB 를 지우지 않게 멈춰요`);
  if (!["localhost", "127.0.0.1"].includes(u.hostname) && process.env.E2E_ALLOW_REMOTE_DB !== "1")
    throw new Error(`E2E DB 가 로컬이 아니에요 (${u.hostname}). 정말이면 E2E_ALLOW_REMOTE_DB=1`);
}

/** 앱 서버와 테스트 프로세스가 같은 DB·서명 키를 보게 */
export const appEnv = {
  DATABASE_URL,
  AUTH_SECRET,
  KAKAO_REST_API_KEY: "e2e-dummy-kakao-key",
  APP_PASSWORD: "",
};
