/**
 * Dashboard signal endpoint — charts (Vela) and panels inside the
 * authenticated dashboard post signals here instead of the public webhook;
 * no passphrase is needed because the session already authenticates the user.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { processAlert } from "../services/alertIngest.js";
import { requireAuth } from "../plugins/auth.js";

const signalSchema = z.object({
  exchange: z.string().min(1),
  strategy: z.string().min(1),
  market: z.string().min(1),
  order: z.enum(["buy", "sell"]),
  price: z.number(),
  position: z.enum(["long", "short", "flat"]),
  reverse: z.boolean(),
  size: z.number().positive().optional(),
  sizeUsd: z.number().positive().optional(),
  collateral: z.string().optional()
});

export async function signalRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/api/signals",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const parsed = signalSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(422).send({
          error: "Validation failed",
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message
          }))
        });
      }
      const outcome = await processAlert(request.user!.id, parsed.data, {
        checkPassphrase: false
      });
      return reply.code(outcome.status).send(outcome.body);
    }
  );
}
