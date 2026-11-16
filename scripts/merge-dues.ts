import "dotenv/config";
import { prisma } from "../src/lib/db";
import { planDueMerge } from "../src/lib/merge-dues";

/**
 * 배포할 때(vercel.json, 운영만) 옛 결제(Due)를 결제·지출(Expense)로 옮기고 지움. 옮길 게 없으면 아무것도 안 함.
 * 결제 하나씩 '만들기 + 지우기'를 한 트랜잭션으로 해서 중간에 끊겨도 두 번 옮겨지지 않음
 */
async function main() {
  const dues = await prisma.due.findMany({ include: { event: { select: { category: true } } }, orderBy: { createdAt: "asc" } });
  if (!dues.length) return console.log("결제 옮기기: 옮길 결제 없음");
  const expenses = await prisma.expense.findMany({ select: { id: true, eventId: true, title: true, amount: true } });
  const plan = planDueMerge(
    dues.map((d) => ({ ...d, eventCategory: d.event.category })),
    expenses,
  );
  for (const { dueId, data } of plan.create) {
    await prisma.$transaction([prisma.expense.create({ data }), prisma.due.delete({ where: { id: dueId } })]);
  }
  for (const { dueId, expenseId } of plan.duplicate) {
    await prisma.due.delete({ where: { id: dueId } });
    console.log(`결제 옮기기: ${dueId} 는 지출 기록 ${expenseId} 와 같은 돈이라 지움`);
  }
  console.log(`결제 옮기기: ${plan.create.length}건 옮김, 같은 돈 ${plan.duplicate.length}건 정리`);
}

main()
  .catch((e) => {
    console.error("결제 옮기기 실패", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
