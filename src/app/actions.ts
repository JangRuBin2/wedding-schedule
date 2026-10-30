"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { addDays, fromYmd } from "@/lib/dates";
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

async function eventFields(form: FormData) {
  return {
    title: text(form, "title", 100),
    category: await validCategory(form.get("category")),
    date: form.get("undated") === "on" ? null : fromYmd(form.get("date")),
  };
}

export async function createEvent(form: FormData) {
  const data = await eventFields(form);
  if (!data.title) return;
  const last = await prisma.event.findFirst({ orderBy: { order: "desc" } });
  const event = await prisma.event.create({ data: { ...data, order: (last?.order ?? 0) + 1 } });
  refresh();
  redirect(`/events/${event.id}`); // 만든 이벤트로 가서 체크리스트·메모를 이어서 채움
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
  await prisma.event.delete({ where: { id } });
  refresh();
  redirect("/events");
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
  redirect(`/events/${eventId}`);
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

// ── 돈 낼 날 ──

function dueFields(form: FormData) {
  return { title: text(form, "title", 60), date: fromYmd(form.get("date")), memo: text(form, "memo", 500) || null };
}

export async function addDue(form: FormData) {
  const eventId = text(form, "eventId", 40);
  const { title, date, memo } = dueFields(form);
  if (!title || !date) return;
  await prisma.due.create({ data: { eventId, title, date, memo } });
  refresh();
  redirect(`/events/${eventId}`);
}

export async function updateDue(form: FormData) {
  const { title, date, memo } = dueFields(form);
  if (!title || !date) return;
  const due = await prisma.due.update({ where: { id: text(form, "id", 40) }, data: { title, date, memo } });
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
