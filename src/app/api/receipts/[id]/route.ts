import { readReceipt } from "@/lib/receipts";

export const dynamic = "force-dynamic";

/** 증빙 이미지 파일. ?size=thumb 면 작은 미리보기. 앱 잠금(proxy)이 이 주소에도 걸려 있음 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const img = await readReceipt(id, new URL(req.url).searchParams.get("size") === "thumb" ? "thumb" : "full");
  if (!img) return new Response("이미지가 없어요", { status: 404 });
  return new Response(img.body, {
    headers: { "Content-Type": img.mime, "Cache-Control": "private, max-age=31536000, immutable" },
  });
}
