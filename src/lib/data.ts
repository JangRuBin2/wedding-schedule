import { prisma } from "./db";

export const getWedding = () => prisma.wedding.findUnique({ where: { id: 1 } });

/** 이벤트 전체와 그 안의 할 일·돈 낼 날 (결혼 준비 일정은 많아야 수백 개라 한 번에 읽음) */
export const getEvents = () =>
  prisma.event.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: {
      tasks: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      dues: { orderBy: [{ date: "asc" }, { createdAt: "asc" }] },
    },
  });
