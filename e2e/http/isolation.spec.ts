import { expect, test } from "@playwright/test";
import { cookieHeader, createCouple, createEvent, createExpense, createNote, createReceiptFile } from "../support/seed";

/**
 * 커플 격리: 다른 커플 데이터의 주소를 알아도 보이지 않는다.
 * 화면은 스트리밍이라 '찾을 수 없음'도 200 으로 올 수 있어서, 상태 코드가 아니라 **본문에 남의 내용이 없는지**로 본다
 */

test("다른 커플의 이벤트·결제·메모·첨부는 주소를 알아도 안 보인다", async ({ request }) => {
  const mine = await createCouple({ names: ["가", "나"] });
  const theirs = await createCouple({ names: ["다", "라"] });
  const event = await createEvent(theirs, "남의 비밀 이벤트");
  const expense = await createExpense(theirs, "남의 비밀 결제", { amount: 777_000 });
  const note = await createNote(theirs, "남의 비밀 메모");
  const receipt = await createReceiptFile(expense.id, "남의계약서.pdf", Buffer.from([1, 2, 3]));
  const as = { headers: cookieHeader(mine.owner) };

  for (const [path, secret] of [
    [`/events/${event.id}`, "남의 비밀 이벤트"],
    [`/events/${event.id}/edit`, "남의 비밀 이벤트"],
    [`/expenses/${expense.id}`, "남의 비밀 결제"],
    [`/expenses/${expense.id}/edit`, "남의 비밀 결제"],
    [`/notes/${note.id}`, "남의 비밀 메모"],
    ["/events", "남의 비밀 이벤트"],
    ["/expenses", "남의 비밀 결제"],
    ["/budget", "남의 비밀 결제"],
    ["/notes", "남의 비밀 메모"],
  ]) {
    const html = await (await request.get(path, as)).text();
    expect(html, path).not.toContain(secret);
  }
  expect((await request.get(`/api/receipts/${receipt.id}`, as)).status()).toBe(404);

  // 같은 주소를 주인이 열면 보인다 (위 확인이 '아무것도 안 보여서' 통과한 게 아님)
  const own = { headers: cookieHeader(theirs.owner) };
  expect(await (await request.get(`/expenses/${expense.id}`, own)).text()).toContain("남의 비밀 결제");
  expect((await request.get(`/api/receipts/${receipt.id}`, own)).status()).toBe(200);
});
