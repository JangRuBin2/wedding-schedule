import { NextResponse, type NextRequest } from "next/server";
import { kakaoEnabled, readSession, SESSION_COOKIE } from "@/lib/session";

/**
 * 앱 잠금.
 * - KAKAO_REST_API_KEY 가 있으면 카카오 로그인 (여러 커플이 쓰는 서비스 모드)
 * - 없으면 커플 하나만 쓰는 모드: Basic Auth (아이디 아무거나, 비밀번호 = APP_PASSWORD). 비워 두면 잠그지 않음
 */
/** 로그인 없이 열리는 주소: 개인정보처리방침·이용약관 (스토어 심사·가입 전 안내용) */
const PUBLIC = ["/privacy", "/terms"];

/**
 * 플레이스토어 앱(TWA)은 시작 주소에 ?app=twa 를 붙여 열림 → 쿠키로 기억해서 앱 안에선 외부 결제(후원 링크)를 숨김
 * (구글 플레이 정책: 앱 안에서 개인에게 보내는 후원은 Play 결제로만)
 */
const APP_COOKIE = "bomnal_app";

export async function proxy(req: NextRequest) {
  const res = await gate(req);
  if (req.nextUrl.searchParams.get("app") === "twa" && !req.cookies.get(APP_COOKIE)) {
    res.cookies.set({ name: APP_COOKIE, value: "twa", maxAge: 5 * 365 * 86400, sameSite: "lax", path: "/", httpOnly: true });
  }
  return res;
}

async function gate(req: NextRequest) {
  if (PUBLIC.includes(req.nextUrl.pathname)) return NextResponse.next();
  if (kakaoEnabled()) return kakao(req);

  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    try {
      // 한글 비밀번호도 되게 UTF-8로 디코딩
      const bytes = Uint8Array.from(atob(auth.slice(6)), (c) => c.charCodeAt(0));
      const decoded = new TextDecoder().decode(bytes);
      const pass = decoded.slice(decoded.indexOf(":") + 1);
      if (pass === password) return NextResponse.next();
    } catch {
      // 깨진 헤더는 그냥 다시 로그인 요청
    }
  }
  return new NextResponse("로그인이 필요해요", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="bomnal", charset="UTF-8"' },
  });
}

async function kakao(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path === "/login" || path.startsWith("/api/auth/")) return NextResponse.next();
  const s = await readSession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) {
    const to = new URL("/login", req.url);
    if (path !== "/") to.searchParams.set("next", path);
    return NextResponse.redirect(to);
  }
  // 커플 소속·탈퇴는 화면에서 DB 로 다시 확인 (src/lib/tenant.ts). 여기선 로그인만
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon|apple-icon|heart.svg|icon-.*\\.png).*)"],
};
