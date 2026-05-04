import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "./logger";

function sanitizeMongoUri(uri: string): string {
  const trimmed = uri.trim();
  const queryIndex = trimmed.indexOf("?");

  if (queryIndex === -1) {
    return trimmed;
  }

  const base = trimmed.slice(0, queryIndex);
  const query = trimmed.slice(queryIndex + 1);

  if (!query) {
    return base;
  }

  const normalizedParams = query
    .split("&")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .filter((pair) => {
      const equalsIndex = pair.indexOf("=");
      if (equalsIndex === -1) return true;
      const value = pair.slice(equalsIndex + 1).trim();
      return value.length > 0;
    });

  return normalizedParams.length > 0 ? `${base}?${normalizedParams.join("&")}` : base;
}

function isSrvDnsResolutionError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message;
  return (
    message.includes("querySrv") &&
    (message.includes("ECONNREFUSED") || message.includes("ENOTFOUND"))
  );
}

function extractErrorCode(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }

  if (error instanceof Error && error.message.includes("ECONNREFUSED")) {
    return "ECONNREFUSED";
  }

  if (error instanceof Error && error.message.includes("ENOTFOUND")) {
    return "ENOTFOUND";
  }

  return "UNKNOWN";
}

async function connectWithUri(uri: string, label: "MONGO_URI" | "MONGO_FALLBACK_URI") {
  const sanitizedUri = sanitizeMongoUri(uri);
  if (sanitizedUri !== uri.trim()) {
    logger.debug(`${label} contained empty query options and was sanitized`);
  }

  await mongoose.connect(sanitizedUri, {
    autoIndex: !env.IS_PRODUCTION,
    maxPoolSize: env.MONGO_MAX_POOL_SIZE,
    minPoolSize: env.MONGO_MIN_POOL_SIZE,
    serverSelectionTimeoutMS: env.MONGO_SERVER_SELECTION_TIMEOUT_MS,
  });
}

export async function connectDatabase(): Promise<void> {
  mongoose.set("strictQuery", true);
  mongoose.set("autoIndex", !env.IS_PRODUCTION);

  try {
    await connectWithUri(env.MONGO_URI, "MONGO_URI");
    logger.info("Connected to MongoDB");
    return;
  } catch (error) {
    const shouldTryFallback =
      env.MONGO_URI.startsWith("mongodb+srv://") && isSrvDnsResolutionError(error);

    if (!shouldTryFallback) {
      throw error;
    }

    const fallbackUri = env.MONGO_FALLBACK_URI.trim();
    if (!fallbackUri) {
      throw new Error(
        "MongoDB SRV lookup failed while connecting with MONGO_URI. Set MONGO_FALLBACK_URI to a direct mongodb:// URI for DNS-restricted environments.",
        { cause: error instanceof Error ? error : undefined },
      );
    }

    logger.warn(
      `Primary MongoDB SRV lookup failed (${extractErrorCode(error)}); retrying with MONGO_FALLBACK_URI`,
    );

    await connectWithUri(fallbackUri, "MONGO_FALLBACK_URI");
    logger.info("Connected to MongoDB (fallback URI)");
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
  logger.info("Disconnected from MongoDB");
}
