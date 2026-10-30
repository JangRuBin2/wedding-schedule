import { cookies } from "next/headers";
import { kakaoEnabled, readSession, SESSION_COOKIE } from "./session";

/**
 * 누가 체크했는지 남길 이름.
 * 카카오 로그인을 쓰면 로그인한 사람, 비밀번호로 잠그면 기기마다 고른 '이 기기는 누구'
 */
export const ME_COOKIE = "bomnal_me";

export async function currentSession() {
  return readSession((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function getMe(): Promise<string | null> {
  const jar = await cookies();
  if (kakaoEnabled()) return (await readSession(jar.get(SESSION_COOKIE)?.value))?.name ?? null;
  const v = jar.get(ME_COOKIE)?.value;
  return v ? decodeURIComponent(v) : null;
}
