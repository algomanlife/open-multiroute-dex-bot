/** Dashboard data routes: trades, positions, alerts, stats. */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../plugins/auth.js";

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

export async function dataRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/api/trades",
    { preHandler: [requireAuth] },
    async (request) => {
      const { limit, offset } = listQuerySchema.parse(request.query);
      const trades = await prisma.trade.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset
      });
      return { trades, limit, offset };
    }
  );

  app.get(
    "/api/positions",
    { preHandler: [requireAuth] },
    async (request) => {
      const positions = await prisma.position.findMany({
        where: { status: "OPEN" },
        orderBy: { openedAt: "desc" }
      });
      return { positions };
    }
  );

  app.get(
    "/api/alerts",
    { preHandler: [requireAuth] },
    async (request) => {
      const { limit, offset } = listQuerySchema.parse(request.query);
      const alerts = await prisma.alert.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset
      });
      return { alerts, limit, offset };
    }
  );

  app.get(
    "/api/stats",
    { preHandler: [requireAuth] },
    async () => {
      const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);
      const [totalTrades, winningTrades, pnlAggregate, openPositions, alertsToday] =
        await Promise.all([
          prisma.trade.count(),
          prisma.trade.count({ where: { pnl: { gt: 0 } } }),
          prisma.trade.aggregate({ _sum: { pnl: true } }),
          prisma.position.count({ where: { status: "OPEN" } }),
          prisma.alert.count({ where: { createdAt: { gte: dayAgo } } })
        ]);
      return {
        totalTrades,
        winRate: totalTrades > 0 ? winningTrades / totalTrades : 0,
        totalPnl: pnlAggregate._sum.pnl ?? 0,
        openPositions,
        alertsToday
      };
    }
  );

  app.get("/healthz", async () => ({ status: "ok", app: "open-multiroute-dex-bot" }));
}
