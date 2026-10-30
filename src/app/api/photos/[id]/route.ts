import { readPhoto } from "@/lib/photos";

export const dynamic = "force-dynamic";

/** 사진 파일. ?size=thumb 면 작은 미리보기. 앱 잠금(proxy)이 이 주소에도 걸려 있음. Blob 은 비공개라 서버가 대신 읽어 보냄 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const photo = await readPhoto(id, new URL(req.url).searchParams.get("size") === "thumb" ? "thumb" : "full");
  if (!photo) return new Response("사진이 없어요", { status: 404 });
  return new Response(photo.body, {
    headers: {
      "Content-Type": photo.mime,
      // 사진은 한 번 올리면 안 바뀜 (지우면 주소도 사라짐)
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
