import "dotenv/config";
import { prisma } from "../src/lib/db";
import { planExpenseGroups } from "../src/lib/expense-groups";

/**
 * 배포할 때(vercel.json, 운영만) 항목(ExpenseGroup)에 안 묶인 옛 결제를 이름대로 묶음. 여러 번 돌려도 같은 결과.
 * '스튜디오 계약금' + '스튜디오잔금' → 항목 '스튜디오' 하나에 계약금·잔금 (제목은 '스튜디오 잔금'처럼 띄어 맞춤).
 * 같은 커플 안에서 이름이 같으면 한 항목. 항목 하나씩 '만들기 + 결제 묶기'를 한 트랜잭션으로
 */
async function main() {
  const loose = await prisma.expense.findMany({
    where: { groupId: null },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    select: { id: true, coupleId: true, title: true, category: true, eventId: true, createdBy: true, createdAt: true },
  });
  if (!loose.length) return console.log("결제 묶기: 묶을 결제 없음");
  const plan = planExpenseGroups(loose);
  for (const g of plan) {
    await prisma.$transaction(async (tx) => {
      const group = await tx.expenseGroup.create({
        data: { coupleId: g.coupleId, title: g.title, category: g.category, eventId: g.eventId, createdBy: g.createdBy, createdAt: g.createdAt },
        select: { id: true },
      });
      for (const e of g.expenses) {
        await tx.expense.update({ where: { id: e.id }, data: { groupId: group.id, label: e.label, title: e.title } });
      }
    });
  }
  console.log(`결제 묶기: 결제 ${loose.length}건을 항목 ${plan.length}개로 묶음`);
}

main()
  .catch((e) => {
    console.error("결제 묶기 실패", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
