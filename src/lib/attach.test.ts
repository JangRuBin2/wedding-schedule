import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanName, fileMime, inlineOk, sizeLabel } from "./attach";

test("첨부 파일: 확장자로 형식을 정하고 모르는 건 거절", () => {
  assert.equal(fileMime("계약서.PDF"), "application/pdf");
  assert.equal(fileMime("견적.hwp"), "application/x-hwp");
  assert.equal(fileMime("예산.xlsx")?.includes("spreadsheet"), true);
  assert.equal(fileMime("virus.exe"), null);
  assert.equal(fileMime("page.html"), null); // 같은 주소에서 열리면 스크립트가 돌 수 있는 형식은 안 받음
  assert.equal(fileMime("image.svg"), null);
  assert.equal(fileMime("이름없음"), null);
});

test("첨부 파일: 이름 정리·크기 표시·바로 열기", () => {
  assert.equal(cleanName("../../etc/passwd.pdf"), "passwd.pdf");
  assert.equal(cleanName('C:\\Users\\a\\"계약"서.pdf'), "계약서.pdf");
  const long = cleanName(`${"가".repeat(200)}.docx`);
  assert.equal(long.length, 120);
  assert.ok(long.endsWith(".docx"));
  assert.equal(sizeLabel(900), "900B");
  assert.equal(sizeLabel(5 * 1024 * 1024), "5.0MB");
  assert.ok(inlineOk("application/pdf"));
  assert.ok(!inlineOk("application/zip"));
});
