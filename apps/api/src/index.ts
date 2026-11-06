/** Server bootstrap. */
import "dotenv/config";
import { buildApp } from "./app.js";
import { loadEnv } from "./config.js";
import { prisma } from "./lib/prisma.js";
import { logger } from "./lib/logger.js";

async function main(): Promise<void> {
  const env = loadEnv();
  const app = await buildApp();

  try {
    await app.listen({ port: env.API_PORT, host: env.API_HOST });
    logger.info(
      { port: env.API_PORT },
      "Open Multiroute DEX Bot API listening (Swagger UI at /docs)"
    );
  } catch (error) {
    logger.fatal({ error }, "Failed to start API server");
    process.exit(1);
  }

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, "Shutting down");
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

void main();
