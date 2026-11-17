"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { addDays, fromTime, fromYmd } from "@/lib/dates";
import { parseWon } from "@/lib/money";
import { checkPlan } from "@/lib/allocate";
import { THEME_COOKIE } from "@/lib/theme";
import { blobsOfEvents, deleteBlobs, storeFileToBlob, storeImage, storePhoto } from "@/lib/photos";
import { cleanName, fileMime, MAX_FILE } from "@/lib/attach";
import { blobsOfExpenses } from "@/lib/receipts";
import { COLOR_PALETTE, FALLBACK_CATEGORY } from "@/lib/meta";
import { getCategories, validCategory } from "@/lib/categories";
import { currentSession, getMe, ME_COOKIE } from "@/lib/me";
import { safeBack } from "@/lib/back";
import { currentUser, getCouple, LEGACY_COUPLE, scoped, scopedClient, type ScopedDb } from "@/lib/tenant";
import { kakaoEnabled, SESSION_COOKIE } from "@/lib/session";
import { parseNoteDoc } from "@/lib/note-doc";
import type { Prisma } from "@/generated/prisma/client";
import { EVENT_TEMPLATES, SUGGESTED_TASKS, templateOffset } from "@/lib/templates";

/** 보기 화면은 열 때마다 서버에서 새로 읽지만, 앞뒤로 이동할 때 남는 화면 캐시도 비움 */
function refresh() {
  revalidatePath("/", "layout");
}

const text = (form: FormData, key: string, max: number) => String(form.get(key) ?? "").trim().slice(0, max);

/** 작성 화면에서 저장한 뒤 보던 화면으로 (폼의 back 값, 없으면 fallback) */
function goBack(form: FormData, fallback: string): never {
  redirect(safeBack(form.get("back"), fallback));
}

/** 체크 토글: 끝내면 언제·누가, 되돌리면 지움 */
const checkData = async (done: boolean) =>
  done ? { done: false, doneAt: null, doneBy: null } : { done: true, doneAt: new Date(), doneBy: await getMe() };

// ── 시작하기 ──

/** 기본 20개 이벤트 중 아직 없는 것만 만듦 */
async function createTemplateEvents(db: ScopedDb) {
  const have = new Set((await db.event.findMany({ select: { templateKey: true } })).map((e) => e.templateKey));
  // 기본 카테고리를 지웠거나 이름을 바꿨으면 '기타'로
  const names = new Set((await getCategories(db)).map((c) => c.name));
  const data = EVENT_TEMPLATES.filter((t) => !have.has(t.key)).map((t) => ({
    order: t.order,
    title: t.title,
    category: names.has(t.category) ? t.category : FALLBACK_CATEGORY,
    templateKey: t.key,
    hint: t.hint ?? null,
    memo: t.memo ?? null,
  }));
  if (data.length) await db.event.createMany({ data });
  return data.length;
}

/** 결혼식 날짜 기준 추천 일정을 날짜 없는 기본 이벤트에만 채움 */
async function fillTemplateDates(db: ScopedDb, weddingDate: Date) {
  const events = await db.event.findMany({ where: { date: null, templateKey: { not: null } } });
  await db.$transaction(
    events
      .filter((e) => templateOffset(e.templateKey) != null)
      .map((e) => db.event.update({ where: { id: e.id }, data: { date: addDays(weddingDate, templateOffset(e.templateKey)!) } })),
  );
}

const namesFrom = (form: FormData) =>
  [text(form, "name1", 30), text(form, "name2", 30)].filter(Boolean);

/** 초대 링크용 코드 (헷갈리는 글자 0·O·1·I 빼고 8자리) */
function newInviteCode() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return [...bytes].map((b) => abc[b % abc.length]).join("");
}

/**
 * 시작하기: 커플을 만들고(카카오면 나를 관리자로 넣음) 기본 일정을 채움.
 * 이미 커플이 있으면 홈으로 (두 번 누르거나 초대받은 뒤 들어온 경우)
 */
export async function start(form: FormData) {
  const date = fromYmd(form.get("date"));
  const names = namesFrom(form);
  let coupleId: string;
  if (kakaoEnabled()) {
    const me = await currentUser();
    if (!me) redirect("/login");
    if (me.coupleId) redirect("/");
    const couple = await prisma.couple.create({ data: { date, names, inviteCode: newInviteCode() } });
    // 동시에 두 번 눌러도 커플은 하나만 남게: 내 coupleId 가 비어 있을 때만 연결, 아니면 방금 만든 건 지움
    const { count } = await prisma.user.updateMany({ where: { id: me.id, coupleId: null }, data: { coupleId: couple.id, role: "OWNER" } });
    if (!count) {
      await prisma.couple.delete({ where: { id: couple.id } });
      redirect("/");
    }
    coupleId = couple.id;
  } else {
    await prisma.couple.upsert({
      where: { id: LEGACY_COUPLE },
      create: { id: LEGACY_COUPLE, date, names, inviteCode: newInviteCode() },
      update: { date, names },
    });
    coupleId = LEGACY_COUPLE;
  }
  const db = scopedClient(coupleId);
  await getCategories(db);
  if (form.get("template") !== "no") {
    await createTemplateEvents(db);
    if (date) await fillTemplateDates(db, date);
  }
  refresh();
  redirect("/");
}

/** 지금 커플 (없으면 시작하기로) */
async function myCouple() {
  await scoped();
  return (await getCouple())!;
}

// ── 결혼식 정보 · 우리 둘 ──

export async function saveWedding(form: FormData) {
  const couple = await myCouple();
  const data = { date: fromYmd(form.get("date")), place: text(form, "place", 100) || null };
  await prisma.couple.update({ where: { id: couple.id }, data });
  refresh();
  goBack(form, "/settings");
}

export async function saveNames(form: FormData) {
  const couple = await myCouple();
  const names = namesFrom(form);
  await prisma.couple.update({ where: { id: couple.id }, data: { names } });
  refresh();
  goBack(form, "/settings");
}

/** 화면 테마 (이 기기에만). system 이면 쿠키를 지워 기기 설정을 따라감 */
export async function saveTheme(form: FormData) {
  const theme = form.get("theme");
  const jar = await cookies();
  if (theme === "light" || theme === "dark") jar.set(THEME_COOKIE, theme, { maxAge: 365 * 86400, sameSite: "lax", path: "/" });
  else jar.delete(THEME_COOKIE);
  refresh();
  redirect("/settings");
}

/** 비밀번호로 잠글 때 '이 기기는 누구' (체크한 사람 기록용) */
export async function setMe(form: FormData) {
  const name = text(form, "name", 30);
  const jar = await cookies();
  if (name) jar.set(ME_COOKIE, encodeURIComponent(name), { maxAge: 365 * 86400, httpOnly: true, sameSite: "lax", path: "/" });
  else jar.delete(ME_COOKIE);
  refresh();
}

export async function fillDates() {
  const db = await scoped();
  const couple = await myCouple();
  if (!couple.date) return;
  await fillTemplateDates(db, couple.date);
  refresh();
}

export async function addTemplateEvents() {
  const db = await scoped();
  const couple = await myCouple();
  await createTemplateEvents(db);
  if (couple.date) await fillTemplateDates(db, couple.date);
  refresh();
}

// ── 이벤트 ──

/** 이벤트 폼 값. 하루 종일이면 시간을 비움. 메모 칸이 없는 폼이면 메모는 그대로 둠 */
async function eventFields(form: FormData) {
  const allDay = form.get("allDay") === "on";
  const startTime = allDay ? null : fromTime(form.get("startTime"));
  return {
    title: text(form, "title", 100),
    category: await validCategory(form.get("category")),
    date: form.get("undated") === "on" ? null : fromYmd(form.get("date")),
    startTime,
    endTime: startTime ? fromTime(form.get("endTime")) : null,
    place: text(form, "place", 100) || null,
    ...(form.has("memo") ? { memo: text(form, "memo", 5000) || null } : {}),
  };
}

export async function createEvent(form: FormData) {
  const db = await scoped();
  const data = await eventFields(form);
  if (!data.title) return;
  const last = await db.event.findFirst({ orderBy: { order: "desc" } });
  const event = await db.event.create({ data: { ...data, order: (last?.order ?? 0) + 1 } });
  refresh();
  // 캘린더의 '추가'에서 왔으면 그 날짜의 캘린더로, 아니면 만든 이벤트로 가서 체크리스트·메모를 이어서 채움
  goBack(form, `/events/${event.id}`);
}

/** 추가 화면(/new) 하나에서 이벤트·할 일·결제 중 고른 것을 저장 */
export async function createEntry(form: FormData) {
  const kind = form.get("kind");
  if (kind === "task") return addTask(form);
  if (kind === "due") return addPayment(form);
  return createEvent(form);
}

export async function updateEvent(form: FormData) {
  const db = await scoped();
  const id = text(form, "id", 40);
  const data = await eventFields(form);
  if (!data.title) return;
  await db.event.update({ where: { id }, data });
  refresh();
  redirect(`/events/${id}`);
}

export async function deleteEvent(id: string) {
  const db = await scoped();
  const blobs = await blobsOfEvents(db, [id]);
  await db.event.delete({ where: { id } });
  await deleteBlobs(blobs);
  refresh();
  redirect("/events");
}

const idList = (ids: unknown) => (Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string").slice(0, 500) : []);

/** 리스트 탭에서 여러 개 골라 지우기 (할 일·사진도 같이 지워짐. 결제·지출은 남고 연결만 끊김) */
export async function deleteEvents(ids: string[]) {
  const db = await scoped();
  const list = idList(ids);
  if (list.length) {
    const blobs = await blobsOfEvents(db, list);
    await db.event.deleteMany({ where: { id: { in: list } } });
    await deleteBlobs(blobs);
  }
  refresh();
}

/**
 * 리스트 탭에서 끌어서 바꾼 순서 저장. ids = 화면에 보이던 이벤트를 새 순서대로.
 * 카테고리로 걸러 본 상태면 그 이벤트들이 원래 차지하던 순서 자리만 서로 바꿔서, 안 보이던 이벤트 자리는 그대로
 */
export async function reorderEvents(ids: string[]) {
  const db = await scoped();
  const list = [...new Set(idList(ids))];
  if (list.length < 2) return;
  const rows = await db.event.findMany({ where: { id: { in: list } }, select: { id: true, order: true, createdAt: true } });
  if (rows.length !== list.length) return;
  const slots = rows.sort((a, b) => a.order - b.order || a.createdAt.getTime() - b.createdAt.getTime()).map((r) => r.order);
  // 같은 order 가 겹쳐 있으면(옛 데이터) 자리를 1씩 벌려서 순서가 확실히 남게
  for (let i = 1; i < slots.length; i++) if (slots[i] <= slots[i - 1]) slots[i] = slots[i - 1] + 1;
  await db.$transaction(list.map((id, i) => db.event.update({ where: { id }, data: { order: slots[i] } })));
  refresh();
}

/** 여러 개 골라 완료. 이미 끝난 건 그대로 (끝낸 사람·날짜 유지) */
export async function completeEvents(ids: string[]) {
  const db = await scoped();
  const list = idList(ids);
  if (list.length) await db.event.updateMany({ where: { id: { in: list }, done: false }, data: { done: true, doneAt: new Date(), doneBy: await getMe() } });
  refresh();
}

export async function toggleEvent(id: string) {
  const db = await scoped();
  const event = await db.event.findUnique({ where: { id } });
  if (!event) return;
  await db.event.update({ where: { id }, data: await checkData(event.done) });
  refresh();
}

export async function saveMemo(form: FormData) {
  const db = await scoped();
  const id = text(form, "id", 40);
  await db.event.update({ where: { id }, data: { memo: text(form, "memo", 5000) || null } });
  refresh();
  redirect(`/events/${id}`);
}

// ── 사진 ──

const MAX_PHOTO = 1_500_000; // 줄인 사진 한 장 (보통 200~500KB)
const MAX_THUMB = 200_000;

/** 브라우저에서 줄인 사진(photo)과 미리보기(thumb)를 순서대로 받아 저장 */
export async function addPhotos(form: FormData) {
  const db = await scoped();
  const eventId = text(form, "eventId", 40);
  if (!(await db.event.findUnique({ where: { id: eventId }, select: { id: true } }))) throw new Error("이벤트가 없어요");
  const photos = form.getAll("photo").filter((f): f is File => f instanceof File);
  const thumbs = form.getAll("thumb").filter((f): f is File => f instanceof File);
  const ws = form.getAll("w").map(Number);
  const hs = form.getAll("h").map(Number);
  if (!photos.length || photos.length > 6 || thumbs.length !== photos.length) throw new Error("사진은 한 번에 1~6장 올릴 수 있어요");
  for (const [i, f] of photos.entries()) {
    if (f.type !== "image/jpeg" || thumbs[i].type !== "image/jpeg") throw new Error("사진 형식이 맞지 않아요");
    if (f.size > MAX_PHOTO || thumbs[i].size > MAX_THUMB) throw new Error("사진이 너무 커요");
  }
  const me = await getMe();
  // Blob 을 연결했으면 Blob(비공개)에, 아니면 DB 에 (src/lib/photos.ts)
  const data = await Promise.all(
    photos.map(async (f, i) => ({
      eventId,
      mime: "image/jpeg",
      ...(await storePhoto(eventId, f, thumbs[i])),
      width: Math.min(10000, Math.max(1, ws[i] || 1)),
      height: Math.min(10000, Math.max(1, hs[i] || 1)),
      createdBy: me,
    })),
  );
  await db.photo.createMany({ data });
  refresh();
  redirect(`/events/${eventId}`);
}

export async function deletePhoto(id: string) {
  const db = await scoped();
  const photo = await db.photo.delete({ where: { id }, select: { eventId: true, url: true, thumbUrl: true } });
  await deleteBlobs([photo]);
  refresh();
  redirect(`/events/${photo.eventId}`);
}

// ── 할 일 ──

/** 할 일 추가. 추천 칩을 누르면(pick) 그 내용으로 바로 저장 */
export async function addTask(form: FormData) {
  const db = await scoped();
  const eventId = text(form, "eventId", 40);
  const event = await db.event.findUnique({ where: { id: eventId }, include: { _count: { select: { tasks: true } } } });
  if (!event) return;
  const picked = SUGGESTED_TASKS.find((t) => t.eventKey === event.templateKey && t.content === form.get("pick"));
  const content = picked?.content ?? text(form, "content", 200);
  if (!content) return;
  await db.task.create({
    data: {
      eventId,
      content,
      section: picked?.section ?? null,
      date: picked ? null : fromYmd(form.get("date")),
      createdBy: await getMe(),
      sortOrder: event._count.tasks,
    },
  });
  refresh();
  goBack(form, `/events/${eventId}`);
}

/** 이벤트의 추천 할 일 한 번에 넣기. 이미 같은 내용이 있으면 건너뜀 */
export async function addSuggestedTasks(eventId: string) {
  const db = await scoped();
  const event = await db.event.findUnique({ where: { id: eventId }, include: { tasks: true } });
  if (!event?.templateKey) return;
  const have = new Set(event.tasks.map((t) => t.content));
  const me = await getMe();
  const data = SUGGESTED_TASKS.filter((t) => t.eventKey === event.templateKey && !have.has(t.content)).map((t, i) => ({
    eventId,
    section: t.section,
    content: t.content,
    createdBy: me,
    sortOrder: event.tasks.length + i,
  }));
  if (data.length) await db.task.createMany({ data });
  refresh();
}

export async function updateTask(form: FormData) {
  const db = await scoped();
  const content = text(form, "content", 200);
  if (!content) return;
  const task = await db.task.update({
    where: { id: text(form, "id", 40) },
    data: { content, date: fromYmd(form.get("date")) },
  });
  refresh();
  goBack(form, `/events/${task.eventId}`);
}

export async function deleteTask(id: string, back?: string) {
  const db = await scoped();
  const task = await db.task.delete({ where: { id } });
  refresh();
  redirect(safeBack(back, `/events/${task.eventId}`));
}

export async function toggleTask(id: string) {
  const db = await scoped();
  const task = await db.task.findUnique({ where: { id } });
  if (!task) return;
  await db.task.update({ where: { id }, data: await checkData(task.done) });
  refresh();
}

// ── 결제 (낼 예정 ↔ 냈어요) ──

/**
 * 결제·지출 한 건을 '냈어요' / '아직'으로. 뒤집기가 아니라 원하는 상태를 받음
 * (둘이 같이 쓸 때 상대가 이미 바꾼 걸 다시 뒤집지 않게)
 */
export async function setPaid(id: string, paid: boolean) {
  const db = await scoped();
  if (typeof id !== "string") return;
  const me = await getMe();
  await db.expense.updateMany({
    where: { id, paid: !paid },
    data: paid ? { paid: true, paidAt: new Date(), paidBy: me, updatedBy: me } : { paid: false, paidAt: null, paidBy: null, updatedBy: me },
  });
  refresh();
}

/** 추가 화면(/new)의 '결제': 증빙 없이 칸만 (증빙은 저장한 뒤 상세에서 붙임) */
async function addPayment(form: FormData) {
  const db = await scoped();
  const title = text(form, "title", 60);
  const date = fromYmd(form.get("date"));
  const paid = form.get("status") === "paid";
  const amount = parseWon(form.get("amount"));
  if (!title || !date || (paid && !amount)) return;
  const eventId = text(form, "eventId", 40) || null;
  const event = eventId ? await db.event.findUnique({ where: { id: eventId }, select: { id: true, category: true } }) : null;
  const me = await getMe();
  await db.expense.create({
    data: {
      title,
      amount,
      date,
      paid,
      ...(paid ? { paidAt: new Date(), paidBy: me } : {}),
      category: event?.category ?? FALLBACK_CATEGORY,
      eventId: event?.id ?? null,
      memo: text(form, "memo", 1000) || null,
      createdBy: me,
      updatedBy: me,
    },
  });
  refresh();
  goBack(form, event ? `/events/${event.id}` : "/budget");
}

// ── 카테고리 ──

/* ───────── 지출 기록 + 증빙 ───────── */

/** 지출 하나에 붙일 수 있는 증빙 이미지 수 */
const MAX_RECEIPTS = 10;
const MAX_RECEIPT = 2_000_000; // 줄인 이미지 한 장 (글씨가 읽히게 사진보다 조금 크게 줄임)

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/**
 * 지출 저장 (id 가 없으면 새로, 있으면 수정). 작성 화면이 결과를 받아서 증빙을 한 장씩 올림.
 * 배포 환경은 서버 에러 메시지를 가려서, 사용자에게 보일 문제는 throw 대신 { ok: false, error } 로 돌려줌
 */
export async function saveExpense(form: FormData): Promise<Result<{ id: string }>> {
  const db = await scoped();
  const id = text(form, "id", 40);
  const title = text(form, "title", 60);
  const rawAmount = text(form, "amount", 30);
  const amount = parseWon(rawAmount);
  const date = fromYmd(form.get("date"));
  const paid = form.get("status") !== "planned";
  if (!title) return { ok: false, error: "항목을 입력해 주세요" };
  if (rawAmount && !amount) return { ok: false, error: "금액은 원 단위 숫자로 20억 원까지 입력해 주세요" };
  if (paid && !amount) return { ok: false, error: "낸 돈은 금액을 입력해 주세요" };
  if (!date) return { ok: false, error: paid ? "결제일을 골라 주세요" : "낼 날을 골라 주세요" };
  const eventId = text(form, "eventId", 40) || null;
  if (eventId && !(await db.event.findUnique({ where: { id: eventId }, select: { id: true } })))
    return { ok: false, error: "고른 이벤트가 없어요. 다시 골라 주세요" };
  const me = await getMe();
  const before = id ? await db.expense.findUnique({ where: { id }, select: { paid: true } }) : null;
  if (id && !before) return { ok: false, error: "지워진 결제예요" };
  // '결제 완료'로 바뀔 때만 낸 때·사람을 새로 남김
  const paidInfo = paid ? (before?.paid ? {} : { paidAt: new Date(), paidBy: me }) : { paidAt: null, paidBy: null };
  const data = {
    title,
    amount,
    date,
    paid,
    ...paidInfo,
    category: await validCategory(form.get("category")),
    eventId,
    memo: text(form, "memo", 1000) || null,
    updatedBy: me,
  };
  if (!id) {
    const created = await db.expense.create({ data: { ...data, createdBy: me }, select: { id: true } });
    refresh();
    return { ok: true, id: created.id };
  }
  // 수정 화면에서 X 를 누른 증빙은 같이 지움 (그 지출의 것만)
  const remove = form.getAll("removeReceipt").map(String).slice(0, MAX_RECEIPTS * 2);
  const gone = remove.length
    ? await db.receipt.findMany({ where: { id: { in: remove }, expenseId: id }, select: { id: true, url: true, thumbUrl: true } })
    : [];
  await db.$transaction([
    db.receipt.deleteMany({ where: { id: { in: gone.map((r) => r.id) } } }),
    db.expense.update({ where: { id }, data }),
  ]);
  await deleteBlobs(gone);
  refresh();
  return { ok: true, id };
}

/** 증빙 이미지 한 장 추가. 여러 장이면 작성 화면이 한 장씩 부름 (요청 크기 한도 4MB 안에 들게) */
export async function addReceipt(form: FormData): Promise<Result> {
  const db = await scoped();
  const expenseId = text(form, "expenseId", 40);
  const photo = form.get("photo");
  const thumb = form.get("thumb");
  if (!(photo instanceof File) || !(thumb instanceof File) || photo.type !== "image/jpeg" || thumb.type !== "image/jpeg")
    return { ok: false, error: "이미지 형식이 맞지 않아요" };
  if (photo.size > MAX_RECEIPT || thumb.size > MAX_THUMB) return { ok: false, error: "이미지가 너무 커요" };
  const count = await db.receipt.count({ where: { expenseId } });
  if (!(await db.expense.findUnique({ where: { id: expenseId }, select: { id: true } }))) return { ok: false, error: "지워진 지출이에요" };
  if (count >= MAX_RECEIPTS) return { ok: false, error: `증빙은 지출 하나에 ${MAX_RECEIPTS}장까지예요` };
  const me = await getMe();
  const stored = await storeImage(`receipts/${expenseId}`, photo, thumb);
  const size = (k: string) => Math.min(10000, Math.max(1, Number(form.get(k)) || 1));
  await db.$transaction([
    db.receipt.create({ data: { expenseId, mime: "image/jpeg", ...stored, width: size("w"), height: size("h"), createdBy: me } }),
    // 증빙을 붙인 것도 수정으로 남김 (상세의 수정일·수정자)
    db.expense.update({ where: { id: expenseId }, data: { updatedBy: me } }),
  ]);
  refresh();
  return { ok: true };
}

/* 첨부 파일 (PDF·한글·엑셀 등): 시작 → 2MB 조각 이어 붙이기 → 끝내기. 이미지는 위 addReceipt 로 줄여서 */

const CHUNK_MAX = 2_200_000;

/** 파일 첨부 시작: 형식·크기·개수를 확인하고 비어 있는(ready=false) 첨부 행을 만듦 */
export async function startReceiptFile(expenseId: string, file: { name: string; size: number }): Promise<Result<{ id: string }>> {
  const db = await scoped();
  const name = cleanName(String(file?.name ?? ""));
  const size = Math.floor(Number(file?.size));
  const mime = fileMime(name);
  if (!mime) return { ok: false, error: `${name}: 이 형식은 첨부할 수 없어요 (PDF·한글·워드·엑셀·파워포인트·txt·csv·zip)` };
  if (!(size > 0 && size <= MAX_FILE)) return { ok: false, error: `${name}: 파일은 5MB 까지 첨부할 수 있어요` };
  if (!(await db.expense.findUnique({ where: { id: String(expenseId) }, select: { id: true } }))) return { ok: false, error: "지워진 결제예요" };
  // 중간에 끊겨 남은 조각은 정리
  await db.receipt.deleteMany({ where: { expenseId, ready: false, createdAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } } });
  if ((await db.receipt.count({ where: { expenseId } })) >= MAX_RECEIPTS) return { ok: false, error: `첨부는 하나에 ${MAX_RECEIPTS}개까지예요` };
  const r = await db.receipt.create({
    data: { expenseId, mime, name, size, data: new Uint8Array(0), ready: false, width: 0, height: 0, createdBy: await getMe() },
    select: { id: true },
  });
  return { ok: true, id: r.id };
}

/** 조각 하나 이어 붙이기. offset = 지금까지 보낸 바이트 (같은 조각을 두 번 보내도 한 번만 붙음) */
export async function appendReceiptChunk(form: FormData): Promise<Result> {
  const id = text(form, "id", 40);
  const offset = Number(form.get("offset"));
  const chunk = form.get("chunk");
  if (!(chunk instanceof File) || chunk.size === 0 || chunk.size > CHUNK_MAX || !Number.isInteger(offset)) return { ok: false, error: "파일 조각이 잘못됐어요" };
  const db = await scoped();
  // 우리 커플의, 아직 올리는 중인 첨부인지 먼저 확인 (아래 SQL 은 범위 확인을 못 함)
  if (!(await db.receipt.findUnique({ where: { id, ready: false }, select: { id: true } }))) return { ok: false, error: "파일을 찾지 못했어요" };
  const bytes = new Uint8Array(await chunk.arrayBuffer());
  const n = await prisma.$executeRaw`
    UPDATE "Receipt" SET data = data || ${bytes}::bytea
    WHERE id = ${id} AND ready = false AND octet_length(data) = ${offset}::int AND ${offset + bytes.length}::int <= size`;
  if (n === 1) return { ok: true };
  // 이미 붙은 조각을 다시 보낸 경우는 성공으로
  const row = await prisma.$queryRaw<{ len: number }[]>`SELECT octet_length(data)::int AS len FROM "Receipt" WHERE id = ${id} AND ready = false`;
  if (row[0] && row[0].len >= offset + bytes.length) return { ok: true };
  return { ok: false, error: "파일을 올리다 끊겼어요. 다시 시도해 주세요" };
}

/** 다 받았으면 Blob 으로 옮기고(연결돼 있으면) 보이게 함 */
export async function finishReceiptFile(id: string): Promise<Result> {
  const db = await scoped();
  const r = await db.receipt.findUnique({ where: { id: String(id) }, select: { id: true, expenseId: true, name: true, size: true, mime: true, data: true, ready: true } });
  if (!r || r.ready || !r.data) return { ok: false, error: "파일을 찾지 못했어요" };
  if (r.data.length !== r.size) return { ok: false, error: "파일을 다 받지 못했어요. 다시 시도해 주세요" };
  const url = await storeFileToBlob(`receipts/${r.expenseId}`, r.name ?? "file", r.data, r.mime);
  const me = await getMe();
  await db.$transaction([
    db.receipt.update({ where: { id: r.id }, data: { ready: true, ...(url ? { url, data: null } : {}) } }),
    db.expense.update({ where: { id: r.expenseId }, data: { updatedBy: me } }),
  ]);
  refresh();
  return { ok: true };
}

export async function deleteExpense(id: string, back?: string) {
  const db = await scoped();
  const blobs = await blobsOfExpenses(db, [id]);
  await db.expense.delete({ where: { id } });
  await deleteBlobs(blobs);
  refresh();
  redirect(safeBack(back, "/expenses"));
}

/* ───────── 메모 ───────── */

/**
 * 메모 저장 (id 가 없으면 새로). 본문은 에디터 JSON 문자열로 받아 스키마로 검사한 뒤 저장.
 * 둘이 같은 메모를 동시에 고치면 나중에 저장한 쪽이 남음
 */
export async function saveNote(input: { id?: string; title?: string; content: string }): Promise<Result<{ id: string }>> {
  const db = await scoped();
  const id = String(input?.id ?? "").slice(0, 40);
  const title = String(input?.title ?? "").trim().slice(0, 80);
  const parsed = parseNoteDoc(input?.content);
  if (!parsed.ok) return parsed;
  if (!title && !parsed.text && !parsed.drawings) return { ok: false, error: "제목이나 내용을 적어 주세요" };
  const me = await getMe();
  const data = { title, content: parsed.doc as Prisma.InputJsonValue, text: parsed.text, drawings: parsed.drawings, updatedBy: me };
  if (!id) {
    const created = await db.note.create({ data: { ...data, createdBy: me }, select: { id: true } });
    refresh();
    return { ok: true, id: created.id };
  }
  const updated = await db.note.updateMany({ where: { id }, data });
  if (!updated.count) return { ok: false, error: "지워진 메모예요" };
  refresh();
  return { ok: true, id };
}

export async function deleteNote(id: string) {
  const db = await scoped();
  await db.note.deleteMany({ where: { id } });
  refresh();
  redirect("/notes");
}

function categoryFields(form: FormData) {
  const color = String(form.get("color") ?? "");
  return { name: text(form, "name", 20), color: COLOR_PALETTE.includes(color) ? color : COLOR_PALETTE[0] };
}

export async function addCategory(form: FormData) {
  const db = await scoped();
  const { name, color } = categoryFields(form);
  if (!name) return;
  const cats = await getCategories();
  if (cats.some((c) => c.name === name)) throw new Error(`'${name}' 카테고리가 이미 있어요`);
  // '기타' 바로 앞에 넣어서 기타는 늘 맨 끝
  const fallback = cats.find((c) => c.name === FALLBACK_CATEGORY);
  const last = Math.max(0, ...cats.filter((c) => c.name !== FALLBACK_CATEGORY).map((c) => c.order));
  await db.$transaction([
    db.category.create({ data: { name, color, order: last + 1 } }),
    ...(fallback && fallback.order <= last + 1 ? [db.category.update({ where: { id: fallback.id }, data: { order: last + 2 } })] : []),
  ]);
  refresh();
  goBack(form, "/settings/categories");
}

/**
 * 예산 설정 화면에서 이름만 적어 바로 카테고리 추가. 색은 아직 안 쓴 색부터 골라 줌.
 * 화면을 떠나지 않고 슬라이더 목록에 붙여야 해서 이동(redirect) 없이 만든 카테고리를 돌려줌
 */
export async function addBudgetCategory(rawName: string): Promise<{ id: string; name: string; color: string; budget: number }> {
  const db = await scoped();
  const name = String(rawName ?? "").trim().slice(0, 20);
  if (!name) throw new Error("카테고리 이름을 입력해 주세요");
  const cats = await getCategories();
  if (cats.some((c) => c.name === name)) throw new Error(`'${name}' 카테고리가 이미 있어요`);
  const used = new Set(cats.map((c) => c.color));
  const color = COLOR_PALETTE.find((c) => !used.has(c)) ?? COLOR_PALETTE[cats.length % COLOR_PALETTE.length];
  // '기타' 바로 앞에 넣어서 기타는 늘 맨 끝 (addCategory 와 같은 규칙)
  const fallback = cats.find((c) => c.name === FALLBACK_CATEGORY);
  const last = Math.max(0, ...cats.filter((c) => c.name !== FALLBACK_CATEGORY).map((c) => c.order));
  const [created] = await db.$transaction([
    db.category.create({ data: { name, color, order: last + 1 } }),
    ...(fallback && fallback.order <= last + 1 ? [db.category.update({ where: { id: fallback.id }, data: { order: last + 2 } })] : []),
  ]);
  refresh();
  return { id: created.id, name: created.name, color: created.color, budget: 0 };
}

/** 이름을 바꾸면 그 카테고리의 이벤트도 같이 바꿈. '기타'는 색만 바꿀 수 있음 */
export async function updateCategory(form: FormData) {
  const db = await scoped();
  const cat = await db.category.findUnique({ where: { id: text(form, "id", 40) } });
  if (!cat) return;
  const { name: input, color } = categoryFields(form);
  const name = cat.name === FALLBACK_CATEGORY ? cat.name : input;
  if (!name) return;
  if (name !== cat.name && (await db.category.findFirst({ where: { name } }))) throw new Error(`'${name}' 카테고리가 이미 있어요`);
  await db.$transaction([
    db.category.update({ where: { id: cat.id }, data: { name, color } }),
    db.event.updateMany({ where: { category: cat.name }, data: { category: name } }),
    db.expense.updateMany({ where: { category: cat.name }, data: { category: name } }),
  ]);
  refresh();
  redirect("/settings/categories");
}

/** 지우면 그 카테고리의 이벤트는 '기타'로. '기타'는 못 지움 */
export async function deleteCategory(id: string) {
  const db = await scoped();
  const cat = await db.category.findUnique({ where: { id } });
  if (!cat || cat.name === FALLBACK_CATEGORY) return;
  await db.$transaction([
    db.event.updateMany({ where: { category: cat.name }, data: { category: FALLBACK_CATEGORY } }),
    db.expense.updateMany({ where: { category: cat.name }, data: { category: FALLBACK_CATEGORY } }),
    db.category.delete({ where: { id } }),
  ]);
  refresh();
  redirect("/settings/categories");
}

// ── 예산 ──

/**
 * 예산 나누기 저장. 카테고리별 금액(만 원 정수)을 받아 원으로 저장.
 * 화면에서 막아도 여기서 다시 확인 (총예산 100만 원 이상, 만 원 단위, 모르는 카테고리는 무시)
 */
export async function saveBudgetPlan(plan: { id: string; man: number }[]) {
  const db = await scoped();
  const cats = await getCategories();
  const byId = new Map((Array.isArray(plan) ? plan : []).map((p) => [String(p?.id), Number(p?.man)]));
  const amounts = cats.map((c) => byId.get(c.id) ?? 0);
  const problem = checkPlan(amounts);
  if (problem) throw new Error(problem);
  await db.$transaction(cats.map((c, i) => db.category.update({ where: { id: c.id }, data: { budget: amounts[i] * 10_000 } })));
  refresh();
  redirect("/budget");
}

// ── 커플 멤버 (카카오 로그인) ──

/** 커플 관리자(만든 사람)만. DB 로 다시 확인 */
async function requireOwner() {
  const me = await currentUser();
  if (!me?.coupleId || me.role !== "OWNER") throw new Error("커플을 만든 사람만 할 수 있어요");
  return me as typeof me & { coupleId: string };
}

/** 멤버 내보내기 (관리자만, 자기 자신은 못 함). 내보낸 사람은 다음 요청부터 바로 못 들어옴 */
export async function removeMember(id: string) {
  const owner = await requireOwner();
  if (typeof id !== "string" || id === owner.id) return;
  await prisma.user.updateMany({ where: { id, coupleId: owner.coupleId }, data: { coupleId: null, role: "MEMBER" } });
  refresh();
}

/** 초대 링크 새로 만들기 (예전 링크는 막힘) */
export async function resetInvite() {
  const owner = await requireOwner();
  await prisma.couple.update({ where: { id: owner.coupleId }, data: { inviteCode: newInviteCode() } });
  refresh();
}

/** 커플 하나에 들어올 수 있는 사람 수 */
const MAX_MEMBERS = 4;

/** 초대 링크로 커플에 합류. 이미 다른 커플에 있으면 안 됨, 커플당 4명까지. 안 되면 초대 화면에 이유를 보여 줌 */
export async function joinCouple(code: string) {
  const me = await currentUser();
  if (!me) redirect("/login");
  const c = String(code ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  const fail = (why: string) => redirect(`/join/${c}?error=${why}`);
  if (me.coupleId) fail("already");
  const couple = await prisma.couple.findUnique({ where: { inviteCode: c }, include: { _count: { select: { users: true } } } });
  if (!couple || couple.id === LEGACY_COUPLE) fail("invalid");
  if (couple!._count.users >= MAX_MEMBERS) fail("full");
  const { count } = await prisma.user.updateMany({ where: { id: me.id, coupleId: null }, data: { coupleId: couple!.id, role: "MEMBER" } });
  if (!count) fail("already");
  refresh();
  redirect("/");
}

/**
 * 커플 나가기 / 계정 삭제.
 * - 나가기: 내 계정은 남고 커플에서만 빠짐 (혼자 남은 마지막 사람이면 커플 데이터도 지움)
 * - 계정 삭제: 위 + 내 계정(카카오 연결 정보·이름) 삭제, 로그아웃
 * 커플에 아무도 안 남으면 일정·결제·메모·사진·첨부를 모두 지움 (파일 저장소 포함)
 */
export async function leaveCouple(form: FormData) {
  const me = await currentUser();
  if (!me) redirect("/login");
  const deleteAccount = form.get("deleteAccount") === "on";
  if (text(form, "confirm", 20) !== (deleteAccount ? "계정 삭제" : "나가기")) redirect(`/settings/leave?error=confirm${deleteAccount ? "&delete=1" : ""}`);
  const coupleId = me.coupleId;
  if (coupleId) {
    await prisma.user.update({ where: { id: me.id }, data: { coupleId: null, role: "MEMBER" } });
    const left = await prisma.user.findMany({ where: { coupleId }, orderBy: { createdAt: "asc" }, select: { id: true, role: true } });
    if (left.length === 0) await deleteCoupleData(coupleId);
    // 만든 사람이 나가면 남은 사람 중 먼저 들어온 사람이 이어받음
    else if (me.role === "OWNER" && !left.some((u) => u.role === "OWNER")) await prisma.user.update({ where: { id: left[0].id }, data: { role: "OWNER" } });
  }
  if (deleteAccount) {
    await prisma.user.delete({ where: { id: me.id } });
    (await cookies()).delete(SESSION_COOKIE);
    redirect("/login");
  }
  refresh();
  redirect("/start");
}

/** 커플 데이터 전부 지우기: 파일 저장소(사진·첨부) → 행 (커플을 지우면 일정·할 일·결제·메모가 같이 지워짐) */
async function deleteCoupleData(coupleId: string) {
  const db = scopedClient(coupleId);
  const [photos, receipts] = await Promise.all([
    db.photo.findMany({ where: { url: { not: null } }, select: { url: true, thumbUrl: true } }),
    db.receipt.findMany({ where: { url: { not: null } }, select: { url: true, thumbUrl: true } }),
  ]);
  await deleteBlobs([...photos, ...receipts]);
  await prisma.couple.delete({ where: { id: coupleId } });
}

/** 이름 바꾸기 (본인, 또는 관리자가 우리 커플 멤버). 체크한 사람으로 남는 이름 */
export async function renameUser(form: FormData) {
  const me = await currentUser();
  const id = text(form, "id", 40);
  const name = text(form, "name", 30);
  if (!me || !name) return;
  if (id !== me.id) {
    const owner = await requireOwner();
    await prisma.user.updateMany({ where: { id, coupleId: owner.coupleId }, data: { name } });
  } else {
    await prisma.user.update({ where: { id }, data: { name } });
  }
  refresh();
  redirect("/settings");
}
