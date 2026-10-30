import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** 사진 파일. ?size=thumb 면 작은 미리보기. 앱 잠금(proxy)이 이 주소에도 걸려 있음 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const thumb = new URL(req.url).searchParams.get("size") === "thumb";
  // 필요한 크기만 읽음 (원본과 미리보기를 같이 읽지 않게)
  const photo = thumb
    ? await prisma.photo.findUnique({ where: { id }, select: { mime: true, thumb: true } }).then((p) => p && { mime: p.mime, bytes: p.thumb })
    : await prisma.photo.findUnique({ where: { id }, select: { mime: true, data: true } }).then((p) => p && { mime: p.mime, bytes: p.data });
  if (!photo) return new Response("사진이 없어요", { status: 404 });
  return new Response(new Uint8Array(photo.bytes), {
    headers: {
      "Content-Type": photo.mime,
      // 사진은 한 번 올리면 안 바뀜 (지우면 주소도 사라짐)
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
