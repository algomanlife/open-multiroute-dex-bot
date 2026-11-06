/**
 * Gains Network routes: demo/test-mode order execution + position queries.
 *
 * The test endpoint places a small market order through the Gains client
 * (testnet/demo chain by default: "arbitrum-sepolia", the environment behind
 * demo.gains.trade), waits for the oracle fill, then returns the resulting
 * position so operators can verify the routing pipeline end-to-end.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { GainsClient, gainsDefaultChain } from "@omdb/core";
import { requireAuth } from "../plugins/auth.js";
import { logger } from "../lib/logger.js";

const testSchema = z.object({
  market: z.string().min(1).default("BTC-USD"),
  side: z.enum(["long", "short"]).default("long"),
  size: z.number().positive().max(10).default(0.01),
  leverage: z.string().default("2"),
  strategy: z.string().min(1).default("gains-demo-test"),
  closeOnly: z.boolean().default(false)
});

export async function gainsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/api/gains/status",
    { preHandler: [requireAuth] },
    async (_request, reply) => {
      const client = new GainsClient();
      return reply.code(200).send({
        configured: Boolean(
          process.env.GAINS_AGENT_KEY && process.env.GAINS_RPC_URL
        ),
        chain: client.chain,
        isDemoChain: client.chain !== "arbitrum",
        agentAddress: client.agentAddress
      });
    }
  );

  app.get(
    "/api/gains/positions",
    { preHandler: [requireAuth] },
    async (_request, reply) => {
      const client = new GainsClient();
      if (!client.agentAddress) {
        return reply.code(503).send({
          error: "GAINS_AGENT_KEY is not configured"
        });
      }
      try {
        const positions = await client.getPositions();
        return reply.code(200).send({ positions });
      } catch (error) {
        logger.error({ error }, "Gains positions query failed");
        return reply.code(502).send({
          error: "Failed to query Gains positions",
          detail: error instanceof Error ? error.message : "unknown"
        });
      }
    }
  );

  app.post(
    "/api/gains/test",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const parsed = testSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(422).send({
          error: "Validation failed",
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message
          }))
        });
      }
      const input = parsed.data;
      const client = new GainsClient();

      if (!process.env.GAINS_AGENT_KEY || !process.env.GAINS_RPC_URL) {
        return reply.code(503).send({
          error:
            "Gains test mode requires GAINS_AGENT_KEY and GAINS_RPC_URL (.env). " +
            "Use a funded testnet agent key for demo.gains.trade (chain " +
            `${gainsDefaultChain()}).`
        });
      }

      try {
        const result = await client.placeOrder({
          exchange: "gains",
          strategy: input.strategy,
          market: input.market,
          order:
            input.closeOnly || input.side === "short" ? "sell" : "buy",
          price: 0,
          position: input.closeOnly ? "flat" : input.side,
          reverse: false,
          size: input.size
        });

        const positions = await client
          .getPositions()
          .catch(() => [] as Awaited<ReturnType<typeof client.getPositions>>);

        return reply.code(200).send({
          accepted: true,
          chain: client.chain,
          order: result ?? { note: "submitted (fill pending)" },
          positions: positions.filter(
            (position) => position.market === input.market.toUpperCase()
          )
        });
      } catch (error) {
        logger.error({ error }, "Gains test order failed");
        return reply.code(502).send({
          accepted: false,
          error: "Gains test order failed",
          detail: error instanceof Error ? error.message : "unknown"
        });
      }
    }
  );
}
