import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";
import { attachFiles, attachmentTiles, clickSaveExpense, fakePdf, fileLink, fillNewExpense, formError, gotoNewExpense } from "../support/money";
import { createCouple, loginAs } from "../support/seed";

/** 지출 첨부: 이미지 외 파일(PDF·한글·엑셀 등) 5MB 까지. 큰 파일은 2MB 조각으로 나눠 올린다 */

const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");

test("5MB 가까운 PDF 도 그대로 올라가고, 내려받으면 같은 파일", async ({ page, context }) => {
  const couple = await createCouple();
  await loginAs(context, couple.owner);
  const pdf = fakePdf("드레스 계약서.pdf", 4_800_000);

  await gotoNewExpense(page);
  await fillNewExpense(page, "드레스", [{ amount: "1500000" }]);
  await attachFiles(page, [pdf]);
  await expect(attachmentTiles(page)).toHaveCount(1);
  await clickSaveExpense(page, "드레스 계약금");

  const link = fileLink(page, "드레스 계약서.pdf");
  await expect(link).toBeVisible();
  const res = await context.request.get((await link.getAttribute("href"))!);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("application/pdf");
  expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  expect(sha(await res.body())).toBe(sha(pdf.buffer));
});

test("5MB 넘는 파일과 모르는 형식은 고를 때 바로 막는다", async ({ page, context }) => {
  const couple = await createCouple();
  await loginAs(context, couple.owner);
  await gotoNewExpense(page);
  await attachFiles(page, [fakePdf("너무큼.pdf", 6_000_000), { name: "실행.exe", mimeType: "application/x-msdownload", buffer: Buffer.from("MZ") }]);
  await expect(formError(page)).toContainText("너무큼.pdf: 5MB 가 넘어요");
  await expect(formError(page)).toContainText("실행.exe: 이 형식은 첨부할 수 없어요");
  await expect(attachmentTiles(page)).toHaveCount(0);
});
