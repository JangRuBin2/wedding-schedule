/** 브라우저에서 이미지를 긴 쪽 max px 의 JPEG 로 줄임 (휴대폰 사진 회전 정보도 반영). 사진·증빙 업로드 공통 */
export async function shrink(file: File, max: number, quality: number) {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => {
    throw new Error(`'${file.name}' 은(는) 열 수 없는 이미지예요. JPG·PNG 로 올려 주세요`);
  });
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  // 투명 PNG(캡처 등)가 검게 나오지 않게 흰 바탕
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
  if (!blob) throw new Error("이미지를 처리하지 못했어요");
  return { blob, w, h };
}
