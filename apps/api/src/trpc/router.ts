/** Type-safe tRPC API (mounted at /trpc) — typed client for the dashboard. */
import { initTRPC } from "@trpc/server";
import type { FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { resolveUser, type AuthedUser } from "../plugins/auth.js";

export async function createContext({
  req
}: {
  req: FastifyRequest;
}): Promise<{ user: AuthedUser | null }> {
  return { user: await resolveUser(req) };
}

const t = initTRPC.context<{ user: AuthedUser | null }>().create();
const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new Error("UNAUTHORIZED");
  return next({ ctx: { user: ctx.user } });
});

export const appRouter = t.router({
  me: protectedProcedure.query(({ ctx }) => ctx.user),
  stats: protectedProcedure.query(async () => {
    const [totalTrades, winningTrades, pnlAggregate, openPositions] =
      await Promise.all([
        prisma.trade.count(),
        prisma.trade.count({ where: { pnl: { gt: 0 } } }),
        prisma.trade.aggregate({ _sum: { pnl: true } }),
        prisma.position.count({ where: { status: "OPEN" } })
      ]);
    return {
      totalTrades,
      winRate: totalTrades > 0 ? winningTrades / totalTrades : 0,
      totalPnl: pnlAggregate._sum.pnl ?? 0,
      openPositions
    };
  }),
  recentTrades: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(20) }))
    .query(async ({ input }) =>
      prisma.trade.findMany({
        orderBy: { createdAt: "desc" },
        take: input.limit
      })
    ),
  positions: protectedProcedure.query(async () =>
    prisma.position.findMany({ where: { status: "OPEN" } })
  )
});

export type AppRouter = typeof appRouter;
