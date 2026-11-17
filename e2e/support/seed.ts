import { randomUUID } from "node:crypto";
import type { BrowserContext } from "@playwright/test";
import { Pool } from "pg";
import { DEFAULT_CATEGORIES } from "../../src/lib/meta";
import { SESSION_COOKIE, signSession } from "../../src/lib/session";
import { BASE_URL, DATABASE_URL } from "../env";

/**
 * 테스트 데이터 만들기. 테스트마다 자기 커플·사용자를 새로 만들어서 병렬로 돌아도 서로 안 건드림.
 * 카카오 로그인 대신 앱과 같은 키로 서명한 세션 쿠키를 넣는다 (src/lib/session.ts).
 * Prisma 클라이언트는 ESM 이라 테스트 러너에서 못 불러서, 테스트 쪽은 SQL 로 직접 넣고 읽는다
 */
const pool = new Pool({ connectionString: DATABASE_URL, max: 3 });
export const sql = async <T = Record<string, unknown>>(text: string, values: unknown[] = []): Promise<T[]> => (await pool.query(text, values)).rows as T[];

export type TestUser = { id: string; name: string; cookie: string };
export type TestCouple = { id: string; inviteCode: string; owner: TestUser };

const id = () => `e2e${randomUUID().replace(/-/g, "")}`;
const short = () => randomUUID().slice(0, 8).toUpperCase();

/** 카카오로 가입만 한 사용자 (커플 없음) */
export const createUser = async (
  name = `테스터${short()}`,
  data: { coupleId?: string; role?: string; createdAt?: Date; activeDays?: number } = {},
): Promise<TestUser> => {
  const uid = id();
  await sql(
    `INSERT INTO "User" (id, "kakaoId", name, "coupleId", role, status, "createdAt", "activeDays") VALUES ($1,$2,$3,$4,$5,'APPROVED',$6,$7)`,
    [uid, `e2e-${randomUUID()}`, name, data.coupleId ?? null, data.role ?? "MEMBER", data.createdAt ?? new Date(), data.activeDays ?? 0],
  );
  return { id: uid, name, cookie: await signSession({ uid, name, role: data.role ?? "MEMBER", status: "APPROVED" }) };
};

/** 시작하기를 마친 커플 + 만든 사람. 기본 카테고리를 넣고, events 가 있으면 이벤트도 (위에서부터 순서대로) */
export const createCouple = async (
  opts: { names?: [string, string]; date?: Date | null; events?: string[]; ownerCreatedAt?: Date; ownerActiveDays?: number } = {},
): Promise<TestCouple> => {
  const cid = id();
  const inviteCode = short();
  await sql(`INSERT INTO "Couple" (id, date, names, "inviteCode", "updatedAt") VALUES ($1,$2,$3,$4,now())`, [cid, opts.date ?? null, opts.names ?? ["민준", "지은"], inviteCode]);
  for (const [i, c] of DEFAULT_CATEGORIES.entries()) {
    await sql(`INSERT INTO "Category" (id, "coupleId", name, color, "order") VALUES ($1,$2,$3,$4,$5)`, [id(), cid, c.name, c.color, i]);
  }
  for (const [i, title] of (opts.events ?? []).entries()) {
    await sql(`INSERT INTO "Event" (id, "coupleId", "order", title, category, "updatedAt") VALUES ($1,$2,$3,$4,'기타',now())`, [id(), cid, i + 1, title]);
  }
  const owner = await createUser(opts.names?.[0] ?? "민준", { coupleId: cid, role: "OWNER", createdAt: opts.ownerCreatedAt, activeDays: opts.ownerActiveDays });
  return { id: cid, inviteCode, owner };
};

/** 커플에 멤버 추가 */
export const addMember = (couple: TestCouple, name = "지은") => createUser(name, { coupleId: couple.id, role: "MEMBER" });

/** 이 브라우저를 그 사람으로 로그인 */
export const loginAs = async (context: BrowserContext, user: TestUser): Promise<void> => {
  await context.clearCookies();
  await context.addCookies([{ name: SESSION_COOKIE, value: user.cookie, url: BASE_URL, httpOnly: true, sameSite: "Lax" }]);
};

/** http 프로젝트(request)용 쿠키 헤더 */
export const cookieHeader = (user: TestUser) => ({ cookie: `${SESSION_COOKIE}=${user.cookie}` });

export const createEvent = async (couple: TestCouple, title: string, data: { done?: boolean } = {}): Promise<{ id: string }> => {
  const eid = id();
  await sql(`INSERT INTO "Event" (id, "coupleId", "order", title, category, done, "updatedAt") VALUES ($1,$2,100,$3,'기타',$4,now())`, [eid, couple.id, title, data.done ?? false]);
  return { id: eid };
};

export const createTask = async (eventId: string, content: string, done = false): Promise<void> => {
  await sql(`INSERT INTO "Task" (id, "eventId", content, done) VALUES ($1,$2,$3,$4)`, [id(), eventId, content, done]);
};

export const createExpense = async (
  couple: TestCouple,
  title: string,
  data: { amount?: number | null; paid?: boolean; category?: string } = {},
): Promise<{ id: string }> => {
  const xid = id();
  await sql(
    `INSERT INTO "Expense" (id, "coupleId", title, amount, paid, date, category, "updatedAt") VALUES ($1,$2,$3,$4,$5,now(),$6,now())`,
    [xid, couple.id, title, data.amount === undefined ? 100_000 : data.amount, data.paid ?? true, data.category ?? "기타"],
  );
  return { id: xid };
};

export const createNote = async (couple: TestCouple, title: string): Promise<{ id: string }> => {
  const nid = id();
  await sql(`INSERT INTO "Note" (id, "coupleId", title, content, text, "updatedAt") VALUES ($1,$2,$3,$4,'',now())`, [nid, couple.id, title, { type: "doc", content: [{ type: "paragraph" }] }]);
  return { id: nid };
};

export const createReceiptFile = async (expenseId: string, name: string, bytes: Buffer): Promise<{ id: string }> => {
  const rid = id();
  await sql(`INSERT INTO "Receipt" (id, "expenseId", mime, name, size, data, width, height, ready) VALUES ($1,$2,'application/pdf',$3,$4,$5,0,0,true)`, [rid, expenseId, name, bytes.length, bytes]);
  return { id: rid };
};
