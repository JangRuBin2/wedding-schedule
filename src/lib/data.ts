import { prisma } from "./db";

export const getWedding = () => prisma.wedding.findUnique({ where: { id: 1 } });

/** 이벤트 전체와 그 안의 할 일·결제 (결혼 준비 일정은 많아야 수백 개라 한 번에 읽음). 결제 = 이벤트에 연결된 결제·지출 */
export const getEvents = () =>
  prisma.event.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: {
      tasks: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      expenses: {
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
        select: { id: true, title: true, date: true, paid: true, amount: true },
      },
    },
  });
