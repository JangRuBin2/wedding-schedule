import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { safeBack } from "@/lib/back";
import { readSession, SESSION_COOKIE, sessionCookie, signSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/** 승인 상태나 이름이 바뀌었을 때 DB 기준으로 세션 쿠키를 다시 발급. ?next= 가 있으면 그리로 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const s = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  const user = s && (await prisma.user.findUnique({ where: { id: s.uid } }));
  if (!user) return NextResponse.redirect(new URL("/login", origin));
  const res = NextResponse.redirect(new URL(user.status === "APPROVED" ? safeBack(url.searchParams.get("next"), "/") : "/login/pending", origin));
  res.cookies.set(sessionCookie(await signSession({ uid: user.id, name: user.name, role: user.role, status: user.status })));
  return res;
}
