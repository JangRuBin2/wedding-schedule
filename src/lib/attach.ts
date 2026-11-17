/**
 * 지출 첨부 파일 규칙 (브라우저·서버 공통). 이미지는 줄여서 '증빙 이미지'로, 나머지는 아래 확장자만 파일 그대로 5MB 까지.
 * 형식은 브라우저가 알려 주는 값 대신 확장자로 정함 (보여 줄 때 Content-Type 도 이 표대로)
 */
export const MAX_FILE = 5 * 1024 * 1024;
/** 한 번에 보내는 조각 (Vercel 요청 한도 4.5MB 안) */
export const CHUNK = 2 * 1024 * 1024;

export const FILE_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  hwp: "application/x-hwp",
  hwpx: "application/hwp+zip",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  zip: "application/zip",
};

/** input accept 값 (이미지 + 위 파일) */
export const ACCEPT = ["image/*", ...Object.keys(FILE_TYPES).map((e) => `.${e}`)].join(",");

export const extOf = (name: string) => (/\.([a-z0-9]{1,5})$/i.exec(name)?.[1] ?? "").toLowerCase();

/** 받을 수 있는 파일이면 Content-Type, 아니면 null */
export const fileMime = (name: string) => FILE_TYPES[extOf(name)] ?? null;

/** 저장할 파일 이름: 경로·제어 문자 빼고 120자까지 (확장자는 남김) */
export function cleanName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const s = base.replace(/[\u0000-\u001f\u007f"<>|:*?]/g, "").trim();
  if (s.length <= 120) return s || "file";
  const ext = extOf(s);
  return `${s.slice(0, 120 - ext.length - 1)}.${ext}`;
}

export function sizeLabel(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

/** 브라우저에서 바로 열어 보여 줘도 되는 형식 (나머지는 내려받기) */
export const inlineOk = (mime: string) => mime.startsWith("image/") || mime === "application/pdf";
