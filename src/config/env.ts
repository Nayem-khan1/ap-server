import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(0).max(65535).default(5000),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  MONGO_FALLBACK_URI: z.string().default(""),

  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET must be at least 16 chars"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16, "JWT_REFRESH_SECRET must be at least 16 chars"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  RESET_TOKEN_EXPIRES_MINUTES: z.coerce.number().int().positive().default(10),
  OTP_EXPIRES_MINUTES: z.coerce.number().int().positive().default(10),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).default(12),

  CORS_ORIGIN: z.string().default("*"),

  EMAIL_HOST: z.string().default(""),
  EMAIL_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  EMAIL_USER: z.string().default(""),
  EMAIL_PASS: z.string().default(""),
  EMAIL_FROM: z.string().default("no-reply@astronomypathshala.com"),

  BKASH_BASE_URL: z.string().default(""),
  BKASH_USERNAME: z.string().default(""),
  BKASH_PASSWORD: z.string().default(""),
  BKASH_APP_KEY: z.string().default(""),
  BKASH_APP_SECRET: z.string().default(""),
  BKASH_CALLBACK_URL: z.string().default(""),
  BKASH_CALLBACK_SUCCESS: z.string().default(""),
  BKASH_CALLBACK_FAIL: z.string().default(""),
  BKASH_CALLBACK_CANCEL: z.string().default(""),
  BKASH_WEBHOOK: z.string().default(""),
  BKASH_TOKEN_CACHE_TTL: z.coerce.number().int().positive().default(3600),

  CLOUDINARY_CLOUD_NAME: z.string().default(""),
  CLOUDINARY_API_KEY: z.string().default(""),
  CLOUDINARY_API_SECRET: z.string().default(""),

  LOG_LEVEL: z
    .enum(["error", "warn", "info", "http", "verbose", "debug", "silly"])
    .default("info"),
});

const normalizedEnv = {
  ...process.env,
  MONGO_URI: process.env.MONGO_URI ?? process.env.MONGO_URL,
  MONGO_FALLBACK_URI:
    process.env.MONGO_FALLBACK_URI ?? process.env.MONGO_URL_FALLBACK ?? "",
  EMAIL_USER: process.env.EMAIL_USER ?? process.env.EMAIL,
  EMAIL_PASS: process.env.EMAIL_PASS ?? process.env.PASSWORD,
};

const parsed = envSchema.safeParse(normalizedEnv);

if (!parsed.success) {
  const message = parsed.error.errors
    .map((item) => `${item.path.join(".")}: ${item.message}`)
    .join("; ");

  throw new Error(`Invalid environment configuration: ${message}`);
}

export const env = parsed.data;
