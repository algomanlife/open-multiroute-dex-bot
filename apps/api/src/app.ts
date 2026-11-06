/** Fastify application factory. */
import Fastify, { type FastifyError } from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import websocket from "@fastify/websocket";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { corsOrigins, loadEnv } from "./config.js";
import { authRoutes } from "./routes/auth.js";
import { webhookRoutes } from "./routes/webhook.js";
import { signalRoutes } from "./routes/signals.js";
import { gainsRoutes } from "./routes/gains.js";
import { exchangeRoutes } from "./routes/exchanges.js";
import { dataRoutes } from "./routes/data.js";
import { broadcastHub } from "./lib/ws.js";
import { appRouter, createContext } from "./trpc/router.js";
import { OmdbError } from "@omdb/core";

export async function buildApp() {
  const env = loadEnv();

  const app = Fastify({
    logger: { level: env.LOG_LEVEL, base: { app: "open-multiroute-dex-bot" } }
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: corsOrigins(env) });
  await app.register(rateLimit, {
    global: false,
    max: 300,
    timeWindow: "1 minute"
  });
  await app.register(websocket);

  await app.register(swagger, {
    openapi: {
      openapi: "3.0.0",
      info: {
        title: "Open Multiroute DEX Bot API",
        description:
          "A comprehensive open-source trading bot that routes TradingView alerts to multiple DEXes",
        version: "2.0.0"
      },
      servers: [{ url: `http://localhost:${env.API_PORT}` }],
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer" }
        }
      }
    }
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  await app.register(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fastifyTRPCPlugin as any,
    {
      prefix: "/trpc",
      trpcOptions: { router: appRouter, createContext }
    }
  );

  // WebSocket endpoint for realtime dashboard updates.
  app.get("/ws", { websocket: true }, (socket) => {
    broadcastHub.add(socket);
  });

  await app.register(authRoutes);
  await app.register(webhookRoutes);
  await app.register(signalRoutes);
  await app.register(gainsRoutes);
  await app.register(exchangeRoutes);
  await app.register(dataRoutes);

  app.setErrorHandler((error: FastifyError, _request, reply) => {
    if (error instanceof OmdbError) {
      return reply.code(error.statusCode).send({
        error: error.code,
        message: error.message
      });
    }
    if (error.validation) {
      return reply.code(422).send({ error: "Validation failed", detail: error.message });
    }
    app.log.error({ err: error }, "Unhandled error");
    return reply.code(500).send({ error: "Internal server error" });
  });

  return app;
}
