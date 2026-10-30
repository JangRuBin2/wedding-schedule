"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { addDays, fromTime, fromYmd } from "@/lib/dates";
import { parseMan } from "@/lib/money";
import { checkPlan } from "@/lib/allocate";
import { THEME_COOKIE } from "@/lib/theme";
import { blobsOfEvents, deleteBlobs, storePhoto } from "@/lib/photos";
import { COLOR_PALETTE, FALLBACK_CATEGORY } from "@/lib/meta";
import { getCategories, validCategory } from "@/lib/categories";
import { currentSession, getMe, ME_COOKIE } from "@/lib/me";
import { safeBack } from "@/lib/back";
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
async function createTemplateEvents() {
  const have = new Set((await prisma.event.findMany({ select: { templateKey: true } })).map((e) => e.templateKey));
  // 기본 카테고리를 지웠거나 이름을 바꿨으면 '기타'로
  const names = new Set((await getCategories()).map((c) => c.name));
  const data = EVENT_TEMPLATES.filter((t) => !have.has(t.key)).map((t) => ({
    order: t.order,
    title: t.title,
    category: names.has(t.category) ? t.category : FALLBACK_CATEGORY,
    templateKey: t.key,
    hint: t.hint ?? null,
    memo: t.memo ?? null,
  }));
  if (data.length) await prisma.event.createMany({ data });
  return data.length;
}

/** 결혼식 날짜 기준 추천 일정을 날짜 없는 기본 이벤트에만 채움 */
async function fillTemplateDates(weddingDate: Date) {
  const events = await prisma.event.findMany({ where: { date: null, templateKey: { not: null } } });
  await prisma.$transaction(
    events
      .filter((e) => templateOffset(e.templateKey) != null)
      .map((e) => prisma.event.update({ where: { id: e.id }, data: { date: addDays(weddingDate, templateOffset(e.templateKey)!) } })),
  );
}

const namesFrom = (form: FormData) =>
  [text(form, "name1", 30), text(form, "name2", 30)].filter(Boolean);

export async function start(form: FormData) {
  const date = fromYmd(form.get("date"));
  const names = namesFrom(form);
  await prisma.wedding.upsert({ where: { id: 1 }, create: { id: 1, date, names }, update: { date, names } });
  if (form.get("template") !== "no") {
    await createTemplateEvents();
    if (date) await fillTemplateDates(date);
  }
  refresh();
  redirect("/");
}

// ── 결혼식 정보 · 우리 둘 ──

export async function saveWedding(form: FormData) {
  const data = { date: fromYmd(form.get("date")), place: text(form, "place", 100) || null };
  await prisma.wedding.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
  refresh();
  goBack(form, "/settings");
}

export async function saveNames(form: FormData) {
  const names = namesFrom(form);
  await prisma.wedding.upsert({ where: { id: 1 }, create: { id: 1, names }, update: { names } });
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
  const wedding = await prisma.wedding.findUnique({ where: { id: 1 } });
  if (!wedding?.date) return;
  await fillTemplateDates(wedding.date);
  refresh();
}

export async function addTemplateEvents() {
  await createTemplateEvents();
  const wedding = await prisma.wedding.findUnique({ where: { id: 1 } });
  if (wedding?.date) await fillTemplateDates(wedding.date);
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
  const data = await eventFields(form);
  if (!data.title) return;
  const last = await prisma.event.findFirst({ orderBy: { order: "desc" } });
  const event = await prisma.event.create({ data: { ...data, order: (last?.order ?? 0) + 1 } });
  refresh();
  // 캘린더의 '추가'에서 왔으면 그 날짜의 캘린더로, 아니면 만든 이벤트로 가서 체크리스트·메모를 이어서 채움
  goBack(form, `/events/${event.id}`);
}

/** 추가 화면(/new) 하나에서 이벤트·할 일·결제 중 고른 것을 저장 */
export async function createEntry(form: FormData) {
  const kind = form.get("kind");
  if (kind === "task") return addTask(form);
  if (kind === "due") return addDue(form);
  return createEvent(form);
}

export async function updateEvent(form: FormData) {
  const id = text(form, "id", 40);
  const data = await eventFields(form);
  if (!data.title) return;
  await prisma.event.update({ where: { id }, data });
  refresh();
  redirect(`/events/${id}`);
}

export async function deleteEvent(id: string) {
  const blobs = await blobsOfEvents([id]);
  await prisma.event.delete({ where: { id } });
  await deleteBlobs(blobs);
  refresh();
  redirect("/events");
}

const idList = (ids: unknown) => (Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string").slice(0, 500) : []);

/** 리스트 탭에서 여러 개 골라 지우기 (할 일·결제도 같이 지워짐) */
export async function deleteEvents(ids: string[]) {
  const list = idList(ids);
  if (list.length) {
    const blobs = await blobsOfEvents(list);
    await prisma.event.deleteMany({ where: { id: { in: list } } });
    await deleteBlobs(blobs);
  }
  refresh();
}

/** 여러 개 골라 완료. 이미 끝난 건 그대로 (끝낸 사람·날짜 유지) */
export async function completeEvents(ids: string[]) {
  const list = idList(ids);
  if (list.length) await prisma.event.updateMany({ where: { id: { in: list }, done: false }, data: { done: true, doneAt: new Date(), doneBy: await getMe() } });
  refresh();
}

export async function toggleEvent(id: string) {
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return;
  await prisma.event.update({ where: { id }, data: await checkData(event.done) });
  refresh();
}

export async function saveMemo(form: FormData) {
  const id = text(form, "id", 40);
  await prisma.event.update({ where: { id }, data: { memo: text(form, "memo", 5000) || null } });
  refresh();
  redirect(`/events/${id}`);
}

// ── 사진 ──

const MAX_PHOTO = 1_500_000; // 줄인 사진 한 장 (보통 200~500KB)
const MAX_THUMB = 200_000;

/** 브라우저에서 줄인 사진(photo)과 미리보기(thumb)를 순서대로 받아 저장 */
export async function addPhotos(form: FormData) {
  const eventId = text(form, "eventId", 40);
  if (!(await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } }))) throw new Error("이벤트가 없어요");
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
  await prisma.photo.createMany({ data });
  refresh();
  redirect(`/events/${eventId}`);
}

export async function deletePhoto(id: string) {
  const photo = await prisma.photo.delete({ where: { id }, select: { eventId: true, url: true, thumbUrl: true } });
  await deleteBlobs([photo]);
  refresh();
  redirect(`/events/${photo.eventId}`);
}

// ── 할 일 ──

/** 할 일 추가. 추천 칩을 누르면(pick) 그 내용으로 바로 저장 */
export async function addTask(form: FormData) {
  const eventId = text(form, "eventId", 40);
  const event = await prisma.event.findUnique({ where: { id: eventId }, include: { _count: { select: { tasks: true } } } });
  if (!event) return;
  const picked = SUGGESTED_TASKS.find((t) => t.eventKey === event.templateKey && t.content === form.get("pick"));
  const content = picked?.content ?? text(form, "content", 200);
  if (!content) return;
  await prisma.task.create({
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
  const event = await prisma.event.findUnique({ where: { id: eventId }, include: { tasks: true } });
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
  if (data.length) await prisma.task.createMany({ data });
  refresh();
}

export async function updateTask(form: FormData) {
  const content = text(form, "content", 200);
  if (!content) return;
  const task = await prisma.task.update({
    where: { id: text(form, "id", 40) },
    data: { content, date: fromYmd(form.get("date")) },
  });
  refresh();
  goBack(form, `/events/${task.eventId}`);
}

export async function deleteTask(id: string, back?: string) {
  const task = await prisma.task.delete({ where: { id } });
  refresh();
  redirect(safeBack(back, `/events/${task.eventId}`));
}

export async function toggleTask(id: string) {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return;
  await prisma.task.update({ where: { id }, data: await checkData(task.done) });
  refresh();
}

// ── 결제 ──

function dueFields(form: FormData) {
  return {
    title: text(form, "title", 60),
    date: fromYmd(form.get("date")),
    amount: parseMan(form.get("amount")),
    memo: text(form, "memo", 500) || null,
  };
}

export async function addDue(form: FormData) {
  const eventId = text(form, "eventId", 40);
  const { title, date, amount, memo } = dueFields(form);
  if (!title || !date) return;
  // '이미 냈어요'면 바로 낸 것으로
  const paid = form.get("paid") === "on" ? await checkData(false) : {};
  await prisma.due.create({ data: { eventId, title, date, amount, memo, ...paid } });
  refresh();
  goBack(form, `/events/${eventId}`);
}

export async function updateDue(form: FormData) {
  const { title, date, amount, memo } = dueFields(form);
  if (!title || !date) return;
  const due = await prisma.due.update({ where: { id: text(form, "id", 40) }, data: { title, date, amount, memo } });
  refresh();
  goBack(form, `/events/${due.eventId}`);
}

export async function deleteDue(id: string, back?: string) {
  const due = await prisma.due.delete({ where: { id } });
  refresh();
  redirect(safeBack(back, `/events/${due.eventId}`));
}

export async function toggleDue(id: string) {
  const due = await prisma.due.findUnique({ where: { id } });
  if (!due) return;
  await prisma.due.update({ where: { id }, data: await checkData(due.done) });
  refresh();
}

// ── 카테고리 ──

function categoryFields(form: FormData) {
  const color = String(form.get("color") ?? "");
  return { name: text(form, "name", 20), color: COLOR_PALETTE.includes(color) ? color : COLOR_PALETTE[0] };
}

export async function addCategory(form: FormData) {
  const { name, color } = categoryFields(form);
  if (!name) return;
  const cats = await getCategories();
  if (cats.some((c) => c.name === name)) throw new Error(`'${name}' 카테고리가 이미 있어요`);
  // '기타' 바로 앞에 넣어서 기타는 늘 맨 끝
  const fallback = cats.find((c) => c.name === FALLBACK_CATEGORY);
  const last = Math.max(0, ...cats.filter((c) => c.name !== FALLBACK_CATEGORY).map((c) => c.order));
  await prisma.$transaction([
    prisma.category.create({ data: { name, color, order: last + 1 } }),
    ...(fallback && fallback.order <= last + 1 ? [prisma.category.update({ where: { id: fallback.id }, data: { order: last + 2 } })] : []),
  ]);
  refresh();
  goBack(form, "/settings/categories");
}

/** 이름을 바꾸면 그 카테고리의 이벤트도 같이 바꿈. '기타'는 색만 바꿀 수 있음 */
export async function updateCategory(form: FormData) {
  const cat = await prisma.category.findUnique({ where: { id: text(form, "id", 40) } });
  if (!cat) return;
  const { name: input, color } = categoryFields(form);
  const name = cat.name === FALLBACK_CATEGORY ? cat.name : input;
  if (!name) return;
  if (name !== cat.name && (await prisma.category.findUnique({ where: { name } }))) throw new Error(`'${name}' 카테고리가 이미 있어요`);
  await prisma.$transaction([
    prisma.category.update({ where: { id: cat.id }, data: { name, color } }),
    prisma.event.updateMany({ where: { category: cat.name }, data: { category: name } }),
  ]);
  refresh();
  redirect("/settings/categories");
}

/** 지우면 그 카테고리의 이벤트는 '기타'로. '기타'는 못 지움 */
export async function deleteCategory(id: string) {
  const cat = await prisma.category.findUnique({ where: { id } });
  if (!cat || cat.name === FALLBACK_CATEGORY) return;
  await prisma.$transaction([
    prisma.event.updateMany({ where: { category: cat.name }, data: { category: FALLBACK_CATEGORY } }),
    prisma.category.delete({ where: { id } }),
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
  const cats = await getCategories();
  const byId = new Map((Array.isArray(plan) ? plan : []).map((p) => [String(p?.id), Number(p?.man)]));
  const amounts = cats.map((c) => byId.get(c.id) ?? 0);
  const problem = checkPlan(amounts);
  if (problem) throw new Error(problem);
  await prisma.$transaction(cats.map((c, i) => prisma.category.update({ where: { id: c.id }, data: { budget: amounts[i] * 10_000 } })));
  refresh();
  redirect("/budget");
}

// ── 카카오 로그인 사용자 관리 ──

/** 관리자만. 쿠키는 위조 못 하지만 역할이 바뀌었을 수 있어서 DB로 한 번 더 확인 */
async function requireOwner() {
  const s = await currentSession();
  const me = s && (await prisma.user.findUnique({ where: { id: s.uid } }));
  if (!me || me.role !== "OWNER" || me.status !== "APPROVED") throw new Error("관리자만 할 수 있어요");
  return me;
}

export async function setUserStatus(id: string, status: "APPROVED" | "REJECTED") {
  const owner = await requireOwner();
  if (id === owner.id) return; // 자기 자신은 못 막음
  await prisma.user.update({ where: { id }, data: { status } });
  refresh();
}

/** 이름 바꾸기 (본인 또는 관리자). 체크한 사람으로 남는 이름 */
export async function renameUser(form: FormData) {
  const s = await currentSession();
  const id = text(form, "id", 40);
  const name = text(form, "name", 30);
  if (!s || !name) return;
  if (id !== s.uid) await requireOwner();
  await prisma.user.update({ where: { id }, data: { name } });
  refresh();
  // 본인 이름이면 세션 쿠키도 새 이름으로
  redirect(id === s.uid ? "/api/auth/refresh?next=/settings" : "/settings");
}
