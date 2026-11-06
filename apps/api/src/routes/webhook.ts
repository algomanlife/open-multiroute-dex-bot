/** TradingView webhook receiver — the external alert entrypoint. */
import type { FastifyInstance } from "fastify";
import { processAlert } from "../services/alertIngest.js";

export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/api/webhook",
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: "1 minute"
        }
      }
    },
    async (request, reply) => {
      const userId =
        typeof request.query === "object" &&
        request.query !== null &&
        "userId" in request.query
          ? String((request.query as { userId: unknown }).userId)
          : null;

      const outcome = await processAlert(userId, request.body, {
        checkPassphrase: true
      });
      return reply.code(outcome.status).send(outcome.body);
    }
  );
}
