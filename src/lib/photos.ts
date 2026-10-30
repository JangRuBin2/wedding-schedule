import { del, get, put } from "@vercel/blob";
import { prisma } from "./db";

/**
 * 사진 파일 저장소. Vercel Blob(비공개)을 연결했으면 거기에, 아니면 DB(Bytes)에.
 * 화면은 늘 /api/photos/[id] 로 받아서 앱 잠금이 그대로 걸리고, Blob 주소가 새어도 비공개라 열리지 않음
 */
export const blobEnabled = () => !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

const ACCESS = "private" as const;

async function upload(pathname: string, body: Buffer | Blob, contentType: string) {
  const r = await put(pathname, body, { access: ACCESS, contentType, addRandomSuffix: true });
  return r.url;
}

/** 줄인 사진·미리보기 저장할 곳 (Photo 행에 넣을 값) */
export async function storePhoto(eventId: string, photo: Blob, thumb: Blob) {
  if (blobEnabled()) {
    const [url, thumbUrl] = await Promise.all([
      upload(`photos/${eventId}/photo.jpg`, photo, "image/jpeg"),
      upload(`photos/${eventId}/thumb.jpg`, thumb, "image/jpeg"),
    ]);
    return { url, thumbUrl, data: null, thumb: null };
  }
  return {
    url: null,
    thumbUrl: null,
    data: new Uint8Array(await photo.arrayBuffer()),
    thumb: new Uint8Array(await thumb.arrayBuffer()),
  };
}

/** 사진 내용 (Response 본문으로 바로 쓸 수 있게). 없으면 null */
export async function readPhoto(id: string, size: "full" | "thumb") {
  const p = await prisma.photo.findUnique({ where: { id }, select: { mime: true, url: true, thumbUrl: true } });
  if (!p) return null;
  const url = size === "thumb" ? p.thumbUrl : p.url;
  if (url) {
    const r = await get(url, { access: ACCESS });
    return r?.statusCode === 200 ? { mime: p.mime, body: r.stream as BodyInit } : null;
  }
  // 아직 DB 에 있는 사진: 필요한 크기만 읽음
  const bytes =
    size === "thumb"
      ? (await prisma.photo.findUnique({ where: { id }, select: { thumb: true } }))?.thumb
      : (await prisma.photo.findUnique({ where: { id }, select: { data: true } }))?.data;
  if (!bytes) return null;
  // Blob 을 연결한 뒤 처음 보는 예전 사진은 이참에 옮겨 둠 (실패해도 보여 주는 데는 지장 없음)
  if (blobEnabled()) await moveToBlob(id).catch((e) => console.error("사진 옮기기 실패", id, e));
  return { mime: p.mime, body: new Uint8Array(bytes) as BodyInit };
}

/** DB 에 바이트로 있는 사진 하나를 Blob 으로 옮기고 바이트는 비움. 옮겼으면 true */
export async function moveToBlob(id: string) {
  const p = await prisma.photo.findUnique({ where: { id }, select: { eventId: true, mime: true, url: true, data: true, thumb: true } });
  if (!p || p.url || !p.data || !p.thumb) return false;
  const [url, thumbUrl] = await Promise.all([
    upload(`photos/${p.eventId}/photo.jpg`, Buffer.from(p.data), p.mime),
    upload(`photos/${p.eventId}/thumb.jpg`, Buffer.from(p.thumb), p.mime),
  ]);
  // 그사이 다른 요청이 먼저 옮겼으면 방금 올린 건 지움
  const { count } = await prisma.photo.updateMany({ where: { id, url: null }, data: { url, thumbUrl, data: null, thumb: null } });
  if (count === 0) await del([url, thumbUrl]).catch(() => {});
  return count > 0;
}

/** DB 에 남은 사진을 전부 Blob 으로 (배포할 때 scripts/move-photos-to-blob.ts 가 부름) */
export async function moveAllToBlob() {
  if (!blobEnabled()) return { moved: 0, failed: 0, skipped: true };
  const ids = (await prisma.photo.findMany({ where: { url: null }, select: { id: true } })).map((p) => p.id);
  let moved = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      if (await moveToBlob(id)) moved++;
    } catch (e) {
      failed++;
      console.error("사진 옮기기 실패", id, e);
    }
  }
  return { moved, failed, skipped: false };
}

/** 행을 지운 뒤 Blob 파일도 지움. 실패해도 화면 동작은 막지 않음(남은 파일은 주인 없는 파일일 뿐) */
export async function deleteBlobs(rows: { url: string | null; thumbUrl: string | null }[]) {
  const urls = rows.flatMap((r) => [r.url, r.thumbUrl]).filter((u): u is string => !!u);
  if (urls.length && blobEnabled()) await del(urls).catch((e) => console.error("Blob 지우기 실패", e));
}

/** 이벤트(들)를 지우기 전에 그 사진의 Blob 주소를 모아 둠 (행은 이벤트와 같이 지워짐) */
export const blobsOfEvents = (eventIds: string[]) =>
  prisma.photo.findMany({ where: { eventId: { in: eventIds }, url: { not: null } }, select: { url: true, thumbUrl: true } });
