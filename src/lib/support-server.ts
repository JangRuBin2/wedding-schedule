import { prisma } from "./db";
import { ymd } from "./dates";
import { inStoreApp } from "./app";
import { supportUrl } from "./operator";
import { shouldAskSupport } from "./support";
import { currentUser, LEGACY_COUPLE, scoped } from "./tenant";

/**
 * 홈을 열 때: 오늘 쓴 날로 한 번 세고(하루 한 번만 DB 에 씀), 후원 안내를 띄울지 정함.
 * 안 띄우는 경우: 후원 주소 없음, 플레이스토어 앱 안(Play 정책), 비밀번호 모드, 첫 커플(만든 사람들), 규칙 미달
 */
export async function supportPromptForHome(now = new Date()): Promise<{ url: string; done: number } | null> {
  const me = await currentUser();
  if (!me) return null;
  const today = ymd(now);
  await prisma.user.updateMany({
    where: { id: me.id, OR: [{ lastActiveDay: null }, { lastActiveDay: { not: today } }] },
    data: { activeDays: { increment: 1 }, lastActiveDay: today },
  });

  const url = supportUrl();
  if (!url || me.coupleId === LEGACY_COUPLE || (await inStoreApp())) return null;
  const u = await prisma.user.findUnique({ where: { id: me.id }, select: { createdAt: true, activeDays: true, supportOptOut: true, supportSnooze: true } });
  if (!u || u.supportOptOut) return null;
  const db = await scoped();
  const [events, tasks, paid] = await Promise.all([
    db.event.count({ where: { done: true } }),
    db.task.count({ where: { done: true } }),
    db.expense.count({ where: { paid: true } }),
  ]);
  const done = events + tasks + paid;
  return shouldAskSupport(u, done, now) ? { url, done } : null;
}

/** 마이 화면의 후원 메뉴를 보여 줄지 */
export async function supportMenuUrl() {
  const url = supportUrl();
  return url && !(await inStoreApp()) ? url : null;
}
