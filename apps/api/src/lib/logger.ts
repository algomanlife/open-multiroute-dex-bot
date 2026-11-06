/** Structured logging via Pino. */
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { app: "open-multiroute-dex-bot", component: "api" }
});
