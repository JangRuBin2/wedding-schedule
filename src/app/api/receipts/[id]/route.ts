import { inlineOk } from "@/lib/attach";
import { readReceipt } from "@/lib/receipts";

export const dynamic = "force-dynamic";

/**
 * 지출 첨부 (이미지·파일). ?size=thumb 면 이미지 미리보기. 앱 잠금(proxy)이 이 주소에도 걸려 있음.
 * 이미지·PDF 는 브라우저에서 바로 열고, 나머지 파일은 내려받기. 형식 추측(sniff)은 막음
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = await readReceipt(id, new URL(req.url).searchParams.get("size") === "thumb" ? "thumb" : "full");
  if (!f) return new Response("첨부가 없어요", { status: 404 });
  const headers: Record<string, string> = {
    "Content-Type": f.mime,
    "Cache-Control": "private, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  };
  if (f.name) {
    const mode = inlineOk(f.mime) ? "inline" : "attachment";
    headers["Content-Disposition"] = `${mode}; filename="${f.name.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(f.name)}`;
  }
  return new Response(f.body, { headers });
}
