import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { kakaoEnabled, readSession, SESSION_COOKIE } from "./session";

/**
 * 여러 커플이 같이 쓰는 서비스: 화면·저장 함수는 늘 `scoped()` 가 돌려주는 DB 로만 읽고 씀.
 * 이 DB 는 모든 질의에 '지금 커플 것만' 조건을 자동으로 붙여서, 질의 하나를 빼먹어도 남의 데이터가 섞이지 않음.
 *
 * - 직접 coupleId 가 있는 것: Category · Event · Expense · ExpenseGroup · Note
 * - 부모를 따라가는 것: Task·Photo(→ Event), Receipt(→ Expense). 만들 때 부모가 우리 커플 것인지 확인
 * - Couple · User 는 여기서 걸러지지 않음 (가입·초대·계정 화면에서 직접 다룸)
 *
 * 카카오 로그인을 안 쓰는 모드(비밀번호 잠금·로컬 개발)는 커플 하나(LEGACY_COUPLE)만 있는 예전 방식 그대로
 */
export const LEGACY_COUPLE = "legacy";

const OWN = new Set(["Category", "Event", "Expense", "ExpenseGroup", "Note"]);
const VIA: Record<string, { rel: string; fk: string; parent: "event" | "expense" }> = {
  Task: { rel: "event", fk: "eventId", parent: "event" },
  Photo: { rel: "event", fk: "eventId", parent: "event" },
  Receipt: { rel: "expense", fk: "expenseId", parent: "expense" },
};
const UNIQUE_WHERE = new Set(["findUnique", "findUniqueOrThrow", "update", "delete", "upsert"]);
const WHERE_OPS = new Set([...UNIQUE_WHERE, "findFirst", "findFirstOrThrow", "findMany", "count", "aggregate", "groupBy", "updateMany", "deleteMany", "updateManyAndReturn"]);

export class TenantError extends Error {}

type Rec = Record<string, unknown>;

async function ownsParent(model: string, coupleId: string, ids: unknown[]) {
  const via = VIA[model];
  const list = [...new Set(ids)];
  if (list.some((id) => typeof id !== "string")) throw new TenantError(`${model}: 부모 id 가 없어요`);
  const n =
    via.parent === "event"
      ? await prisma.event.count({ where: { id: { in: list as string[] }, coupleId } })
      : await prisma.expense.count({ where: { id: { in: list as string[] }, coupleId } });
  if (n !== list.length) throw new TenantError(`${model}: 다른 커플의 데이터예요`);
}

/** 커플 하나로 범위를 좁힌 Prisma 클라이언트 */
export function scopedClient(coupleId: string) {
  return prisma.$extends({
    name: "couple-scope",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const own = OWN.has(model);
          const via = VIA[model];
          if (!own && !via) return query(args);
          const a = { ...(args as Rec) };
          const filter: Rec = own ? { coupleId } : { [via.rel]: { is: { coupleId } } };

          if (WHERE_OPS.has(operation)) {
            const where = (a.where ?? {}) as Rec;
            // 유일 키로 찾는 질의는 키를 맨 위에 둬야 해서 펼쳐 붙이고, 나머지는 AND 로
            a.where = UNIQUE_WHERE.has(operation) ? { ...where, ...filter } : { AND: [where, filter] };
          }
          if (operation === "create" || operation === "upsert") {
            const key = operation === "create" ? "data" : "create";
            const data = { ...(a[key] as Rec) };
            if (own) data.coupleId = coupleId;
            else await ownsParent(model, coupleId, [data[via.fk]]);
            a[key] = data;
          }
          if (operation === "createMany" || operation === "createManyAndReturn") {
            const rows = (Array.isArray(a.data) ? a.data : [a.data]) as Rec[];
            if (own) a.data = rows.map((r) => ({ ...r, coupleId }));
            else await ownsParent(model, coupleId, rows.map((r) => r[via.fk]));
          }
          if ((operation === "update" || operation === "updateMany" || operation === "upsert") && own) {
            // 다른 커플로 옮기는 수정은 막음
            const key = operation === "upsert" ? "update" : "data";
            if (a[key] && "coupleId" in (a[key] as Rec)) a[key] = { ...(a[key] as Rec), coupleId };
          }
          return query(a as typeof args);
        },
      },
    },
  });
}
export type ScopedDb = ReturnType<typeof scopedClient>;

export type Me = { id: string; name: string; role: string; coupleId: string | null } | null;

/** 지금 로그인한 사람 (카카오 모드만). DB 에서 읽어서, 탈퇴·내보내기가 바로 반영됨 */
export const currentUser = cache(async (): Promise<Me> => {
  if (!kakaoEnabled()) return null;
  const s = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return null;
  const u = await prisma.user.findUnique({ where: { id: s.uid }, select: { id: true, name: true, role: true, coupleId: true, status: true } });
  return u && u.status !== "REJECTED" ? { id: u.id, name: u.name, role: u.role, coupleId: u.coupleId } : null;
});

/** 지금 커플 id. 아직 없으면(시작 전) null */
export const currentCoupleId = cache(async (): Promise<string | null> => {
  if (!kakaoEnabled()) {
    return (await prisma.couple.findUnique({ where: { id: LEGACY_COUPLE }, select: { id: true } })) ? LEGACY_COUPLE : null;
  }
  return (await currentUser())?.coupleId ?? null;
});

/**
 * 화면·저장 함수에서 쓰는 우리 커플 DB. 로그인 안 했으면 로그인으로, 커플이 없으면 시작하기로 보냄.
 * 같은 요청 안에서는 한 번만 만듦
 */
export const scoped = cache(async (): Promise<ScopedDb> => {
  if (kakaoEnabled() && !(await currentUser())) redirect("/login");
  const id = await currentCoupleId();
  if (!id) redirect("/start");
  return scopedClient(id);
});

/** 파일 내려받기 같은 API 용: 넘기지 않고 없으면 null */
export async function scopedOrNull(): Promise<ScopedDb | null> {
  const id = await currentCoupleId();
  return id ? scopedClient(id) : null;
}

/** 지금 커플 정보 (결혼식 날짜·장소·이름·초대 코드) */
export const getCouple = cache(async () => {
  const id = await currentCoupleId();
  return id ? prisma.couple.findUnique({ where: { id } }) : null;
});
