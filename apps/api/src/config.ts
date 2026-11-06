/** Central env-var access for the API server. */
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().default(3000),
  API_HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().min(1),
  WEBHOOK_PASSPHRASE: z.string().optional(),
  CORS_ORIGINS: z.string().default("http://localhost:3001"),
  CREDENTIALS_ENCRYPTION_KEY: z.string().optional(),
  AUTH_SESSION_TTL_HOURS: z.coerce.number().default(168),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info")
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(processEnv: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(processEnv);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  return parsed.data;
}

export function corsOrigins(env: Env): string[] {
  return env.CORS_ORIGINS === "*"
    ? ["*"]
    : env.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean);
}
