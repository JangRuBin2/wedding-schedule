import { get } from "@vercel/blob";
import { prisma } from "./db";
import { ACCESS } from "./photos";

/** 증빙 이미지 내용 (Response 본문으로 바로 쓸 수 있게). 없으면 null. 저장 방식은 사진과 같음 (src/lib/photos.ts) */
export async function readReceipt(id: string, size: "full" | "thumb") {
  const r = await prisma.receipt.findUnique({ where: { id }, select: { mime: true, url: true, thumbUrl: true } });
  if (!r) return null;
  const url = size === "thumb" ? r.thumbUrl : r.url;
  if (url) {
    const res = await get(url, { access: ACCESS });
    return res?.statusCode === 200 ? { mime: r.mime, body: res.stream as BodyInit } : null;
  }
  const bytes =
    size === "thumb"
      ? (await prisma.receipt.findUnique({ where: { id }, select: { thumb: true } }))?.thumb
      : (await prisma.receipt.findUnique({ where: { id }, select: { data: true } }))?.data;
  return bytes ? { mime: r.mime, body: new Uint8Array(bytes) as BodyInit } : null;
}

/** 지출(들)을 지우기 전에 그 증빙의 Blob 주소를 모아 둠 (행은 지출과 같이 지워짐) */
export const blobsOfExpenses = (expenseIds: string[]) =>
  prisma.receipt.findMany({ where: { expenseId: { in: expenseIds }, url: { not: null } }, select: { url: true, thumbUrl: true } });
