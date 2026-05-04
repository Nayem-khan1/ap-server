import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();
dotenv.config({
  path: `.env.${process.env.NODE_ENV ?? "development"}`,
  override: true,
});

type TrustProxySetting = boolean | number | string;

const emptyStringToUndefined = (value: unknown): unknown => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
};

const optionalString = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().default(""),
);

const requiredString = (name: string) =>
  z.preprocess(
    emptyStringToUndefined,
    z.string({ required_error: `${name} is required` }).trim().min(1, {
      message: `${name} is required`,
    }),
  );

const integerFromEnv = (
  defaultValue: number,
  min: number,
  max = Number.MAX_SAFE_INTEGER,
) =>
  z.preprocess(
    emptyStringToUndefined,
    z.coerce.number().int().min(min).max(max).default(defaultValue),
  );

const optionalBoolean = z.preprocess((value) => {
  const normalized = emptyStringToUndefined(value);

  if (typeof normalized !== "string") {
    return normalized;
  }

  const lowerValue = normalized.trim().toLowerCase();

  if (["true", "1", "yes", "y", "on"].includes(lowerValue)) {
    return true;
  }

  if (["false", "0", "no", "n", "off"].includes(lowerValue)) {
    return false;
  }

  return normalized;
}, z.boolean().optional());

function firstNonEmptyEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];

    if (typeof value === "string" && value.trim() !== "") {
      return value;
    }
  }

  return undefined;
}

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isMongoUri(value: string): boolean {
  return value.startsWith("mongodb://") || value.startsWith("mongodb+srv://");
}

function parseTrustProxy(
  value: string,
  isProduction: boolean,
): TrustProxySetting {
  if (!value) {
    return isProduction ? 1 : false;
  }

  const normalized = value.trim().toLowerCase();

  if (["true", "yes", "on"].includes(normalized)) {
    return 1;
  }

  if (["false", "no", "off"].includes(normalized)) {
    return false;
  }

  const numericValue = Number(normalized);
  if (Number.isInteger(numericValue) && numericValue >= 0) {
    return numericValue;
  }

  return value.trim();
}

const optionalHttpUrl = (name: string) =>
  optionalString.refine((value) => !value || isHttpUrl(value), {
    message: `${name} must be a valid http(s) URL`,
  });

const requiredMongoUri = requiredString("MONGO_URI").refine(isMongoUri, {
  message: "MONGO_URI must start with mongodb:// or mongodb+srv://",
});

const optionalMongoUri = optionalString.refine((value) => !value || isMongoUri(value), {
  message: "MONGO_FALLBACK_URI must start with mongodb:// or mongodb+srv://",
});

const rawEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().min(1).default("0.0.0.0"),
  ),
  PORT: integerFromEnv(5000, 0, 65535),
  PUBLIC_API_BASE_URL: optionalHttpUrl("PUBLIC_API_BASE_URL"),
  PUBLIC_WEB_APP_URL: optionalHttpUrl("PUBLIC_WEB_APP_URL"),
  TRUST_PROXY: optionalString,

  MONGO_URI: requiredMongoUri,
  MONGO_FALLBACK_URI: optionalMongoUri,
  MONGO_SERVER_SELECTION_TIMEOUT_MS: integerFromEnv(10000, 1000),
  MONGO_MIN_POOL_SIZE: integerFromEnv(0, 0),
  MONGO_MAX_POOL_SIZE: integerFromEnv(10, 1),

  JWT_ACCESS_SECRET: requiredString("JWT_ACCESS_SECRET").refine(
    (value) => value.length >= 16,
    "JWT_ACCESS_SECRET must be at least 16 chars",
  ),
  JWT_REFRESH_SECRET: z
    .preprocess(emptyStringToUndefined, z.string().trim())
    .refine((value) => value.length >= 16, {
      message: "JWT_REFRESH_SECRET must be at least 16 chars",
    }),
  JWT_ACCESS_EXPIRES_IN: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().default("15m"),
  ),
  JWT_REFRESH_EXPIRES_IN: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().default("7d"),
  ),

  RESET_TOKEN_EXPIRES_MINUTES: integerFromEnv(10, 1),
  OTP_EXPIRES_MINUTES: integerFromEnv(10, 1),
  BCRYPT_SALT_ROUNDS: integerFromEnv(12, 10),

  CORS_ORIGIN: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().default("*"),
  ),
  JSON_BODY_LIMIT: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().default("1mb"),
  ),
  URLENCODED_BODY_LIMIT: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().default("1mb"),
  ),
  URLENCODED_PARAMETER_LIMIT: integerFromEnv(100, 1),
  RATE_LIMIT_WINDOW_MS: integerFromEnv(15 * 60 * 1000, 1000),
  RATE_LIMIT_MAX: integerFromEnv(500, 1),
  AUTH_RATE_LIMIT_WINDOW_MS: integerFromEnv(15 * 60 * 1000, 1000),
  AUTH_RATE_LIMIT_MAX: integerFromEnv(20, 1),
  OTP_RATE_LIMIT_WINDOW_MS: integerFromEnv(60 * 60 * 1000, 1000),
  OTP_RATE_LIMIT_MAX: integerFromEnv(5, 1),

  EMAIL_HOST: optionalString,
  EMAIL_PORT: integerFromEnv(587, 1, 65535),
  EMAIL_USER: optionalString,
  EMAIL_PASS: optionalString,
  EMAIL_FROM: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().email().default("no-reply@astronomypathshala.com"),
  ),

  BKASH_BASE_URL: optionalHttpUrl("BKASH_BASE_URL"),
  BKASH_USERNAME: optionalString,
  BKASH_PASSWORD: optionalString,
  BKASH_APP_KEY: optionalString,
  BKASH_APP_SECRET: optionalString,
  BKASH_CALLBACK_URL: optionalHttpUrl("BKASH_CALLBACK_URL"),
  BKASH_CALLBACK_SUCCESS: optionalHttpUrl("BKASH_CALLBACK_SUCCESS"),
  BKASH_CALLBACK_FAIL: optionalHttpUrl("BKASH_CALLBACK_FAIL"),
  BKASH_CALLBACK_CANCEL: optionalHttpUrl("BKASH_CALLBACK_CANCEL"),
  BKASH_WEBHOOK: optionalHttpUrl("BKASH_WEBHOOK"),
  BKASH_TOKEN_CACHE_TTL: integerFromEnv(3600, 1),

  CLOUDINARY_CLOUD_NAME: optionalString,
  CLOUDINARY_API_KEY: optionalString,
  CLOUDINARY_API_SECRET: optionalString,

  LOG_LEVEL: z
    .enum(["error", "warn", "info", "http", "verbose", "debug", "silly"])
    .optional(),
  REQUIRE_EXTERNAL_SERVICES: optionalBoolean,
  SERVER_KEEP_ALIVE_TIMEOUT_MS: integerFromEnv(65000, 1000),
  SERVER_HEADERS_TIMEOUT_MS: integerFromEnv(66000, 1000),
  SERVER_REQUEST_TIMEOUT_MS: integerFromEnv(300000, 1000),
  SHUTDOWN_GRACE_PERIOD_MS: integerFromEnv(10000, 1000),
}).superRefine((config, ctx) => {
  const corsOrigins = parseCsv(config.CORS_ORIGIN);
  const requireExternalServices =
    config.REQUIRE_EXTERNAL_SERVICES ?? config.NODE_ENV === "production";

  for (const origin of corsOrigins) {
    if (origin !== "*" && !isHttpUrl(origin)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CORS_ORIGIN"],
        message: `Invalid CORS origin: ${origin}`,
      });
    }
  }

  if (config.NODE_ENV === "production") {
    if (config.PORT === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["PORT"],
        message: "PORT cannot be 0 in production",
      });
    }

    if (corsOrigins.length === 0 || corsOrigins.includes("*")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CORS_ORIGIN"],
        message: "CORS_ORIGIN must list explicit origins in production",
      });
    }

    if (config.JWT_ACCESS_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_ACCESS_SECRET"],
        message: "JWT_ACCESS_SECRET must be at least 32 chars in production",
      });
    }

    if (config.JWT_REFRESH_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_REFRESH_SECRET"],
        message: "JWT_REFRESH_SECRET must be at least 32 chars in production",
      });
    }
  }

  if (config.MONGO_MIN_POOL_SIZE > config.MONGO_MAX_POOL_SIZE) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["MONGO_MIN_POOL_SIZE"],
      message: "MONGO_MIN_POOL_SIZE cannot exceed MONGO_MAX_POOL_SIZE",
    });
  }

  if (config.SERVER_HEADERS_TIMEOUT_MS <= config.SERVER_KEEP_ALIVE_TIMEOUT_MS) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["SERVER_HEADERS_TIMEOUT_MS"],
      message:
        "SERVER_HEADERS_TIMEOUT_MS must be greater than SERVER_KEEP_ALIVE_TIMEOUT_MS",
    });
  }

  if (!requireExternalServices) {
    return;
  }

  const requiredExternalValues: Array<[keyof typeof config, string]> = [
    ["EMAIL_HOST", "EMAIL_HOST is required when external services are required"],
    ["EMAIL_USER", "EMAIL_USER is required when external services are required"],
    ["EMAIL_PASS", "EMAIL_PASS is required when external services are required"],
    [
      "CLOUDINARY_CLOUD_NAME",
      "CLOUDINARY_CLOUD_NAME is required when external services are required",
    ],
    [
      "CLOUDINARY_API_KEY",
      "CLOUDINARY_API_KEY is required when external services are required",
    ],
    [
      "CLOUDINARY_API_SECRET",
      "CLOUDINARY_API_SECRET is required when external services are required",
    ],
    ["BKASH_BASE_URL", "BKASH_BASE_URL is required when external services are required"],
    ["BKASH_USERNAME", "BKASH_USERNAME is required when external services are required"],
    ["BKASH_PASSWORD", "BKASH_PASSWORD is required when external services are required"],
    ["BKASH_APP_KEY", "BKASH_APP_KEY is required when external services are required"],
    ["BKASH_APP_SECRET", "BKASH_APP_SECRET is required when external services are required"],
  ];

  for (const [key, message] of requiredExternalValues) {
    if (!config[key]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message,
      });
    }
  }

  if (!config.BKASH_CALLBACK_URL && !config.PUBLIC_API_BASE_URL) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["BKASH_CALLBACK_URL"],
      message:
        "BKASH_CALLBACK_URL or PUBLIC_API_BASE_URL is required when external services are required",
    });
  }

  if (
    (!config.BKASH_CALLBACK_SUCCESS || !config.BKASH_CALLBACK_FAIL) &&
    !config.PUBLIC_WEB_APP_URL
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["PUBLIC_WEB_APP_URL"],
      message:
        "PUBLIC_WEB_APP_URL or bKash success/fail redirect URLs are required when external services are required",
    });
  }
});

const normalizedEnv = {
  ...process.env,
  MONGO_URI: firstNonEmptyEnv("MONGO_URI", "MONGO_URL"),
  MONGO_FALLBACK_URI:
    firstNonEmptyEnv("MONGO_FALLBACK_URI", "MONGO_URL_FALLBACK") ?? "",
  EMAIL_USER: firstNonEmptyEnv("EMAIL_USER", "EMAIL"),
  EMAIL_PASS: firstNonEmptyEnv("EMAIL_PASS", "PASSWORD"),
};

const parsed = rawEnvSchema.safeParse(normalizedEnv);

if (!parsed.success) {
  const message = parsed.error.errors
    .map((item) => `${item.path.join(".")}: ${item.message}`)
    .join("; ");

  throw new Error(`Invalid environment configuration: ${message}`);
}

const isProduction = parsed.data.NODE_ENV === "production";

export const env = {
  ...parsed.data,
  IS_PRODUCTION: isProduction,
  CORS_ORIGINS: parseCsv(parsed.data.CORS_ORIGIN),
  LOG_LEVEL: parsed.data.LOG_LEVEL ?? (isProduction ? "info" : "debug"),
  REQUIRE_EXTERNAL_SERVICES:
    parsed.data.REQUIRE_EXTERNAL_SERVICES ?? isProduction,
  TRUST_PROXY: parseTrustProxy(parsed.data.TRUST_PROXY, isProduction),
};
