import { get } from "@vercel/blob";
import { ACCESS } from "./photos";
import type { ScopedDb } from "./tenant";

/** 첨부 내용 (Response 본문으로 바로 쓸 수 있게). 없거나 아직 올리는 중이면 null. 저장 방식은 사진과 같음 (src/lib/photos.ts) */
export async function readReceipt(db: ScopedDb, id: string, size: "full" | "thumb") {
  const r = await db.receipt.findUnique({ where: { id }, select: { mime: true, url: true, thumbUrl: true, name: true, ready: true } });
  if (!r || !r.ready) return null;
  const url = size === "thumb" ? r.thumbUrl : r.url;
  if (url) {
    const res = await get(url, { access: ACCESS });
    return res?.statusCode === 200 ? { mime: r.mime, name: r.name, body: res.stream as BodyInit } : null;
  }
  const bytes =
    size === "thumb"
      ? (await db.receipt.findUnique({ where: { id }, select: { thumb: true } }))?.thumb
      : (await db.receipt.findUnique({ where: { id }, select: { data: true } }))?.data;
  return bytes ? { mime: r.mime, name: r.name, body: new Uint8Array(bytes) as BodyInit } : null;
}

/** 지출(들)을 지우기 전에 그 증빙의 Blob 주소를 모아 둠 (행은 지출과 같이 지워짐). 우리 커플 것만 */
export const blobsOfExpenses = (db: ScopedDb, expenseIds: string[]) =>
  db.receipt.findMany({ where: { expenseId: { in: expenseIds }, url: { not: null } }, select: { url: true, thumbUrl: true } });
