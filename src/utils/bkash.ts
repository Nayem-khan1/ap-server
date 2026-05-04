import axios from "axios";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { BkashTokenCacheModel } from "../modules/payment/bkash-token-cache.model";

interface BkashGrantTokenResponse {
  id_token: string;
}

interface BkashGatewayRawResponse {
  trxID?: string;
  refundTrxID?: string;
  statusCode?: string;
  statusMessage?: string;
  transactionStatus?: string;
}

export interface BkashGatewayResult {
  trxID: string;
  statusCode: string;
  statusMessage: string;
  transactionStatus: string;
  isSuccessful: boolean;
  raw: unknown;
}

export interface BkashRefundResult {
  refundTrxID: string;
  statusCode: string;
  statusMessage: string;
  isSuccessful: boolean;
  raw: unknown;
}

const TOKEN_CACHE_KEY = "bkash_grant_token";
const ONE_HOUR_MS = 60 * 60 * 1000;
let cachedToken: { value: string; expiresAt: number } | null = null;

function canUseMockGateway(): boolean {
  return !env.IS_PRODUCTION || !env.REQUIRE_EXTERNAL_SERVICES;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function isExampleDomainUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.hostname.toLowerCase() === "example.com";
  } catch {
    return false;
  }
}

function isValidHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function resolveBkashCallbackUrl(): string {
  const configuredCallbackUrl = env.BKASH_CALLBACK_URL.trim();
  if (
    configuredCallbackUrl &&
    isValidHttpUrl(configuredCallbackUrl) &&
    !isExampleDomainUrl(configuredCallbackUrl)
  ) {
    return configuredCallbackUrl;
  }

  const webhookUrl = env.BKASH_WEBHOOK.trim();
  if (webhookUrl && isValidHttpUrl(webhookUrl) && !isExampleDomainUrl(webhookUrl)) {
    return webhookUrl;
  }

  const publicApiBaseUrl = env.PUBLIC_API_BASE_URL.trim();
  if (publicApiBaseUrl) {
    return `${trimTrailingSlash(publicApiBaseUrl)}/api/v1/payments/bkash/callback`;
  }

  if (
    configuredCallbackUrl ||
    webhookUrl
  ) {
    logger.warn("Ignoring invalid bKash callback URL and using local fallback");
  }

  return `http://localhost:${env.PORT}/api/v1/payments/bkash/callback`;
}

function isTokenValid(expiresAtMs: number): boolean {
  return expiresAtMs > Date.now();
}

function normalizeBkashResult(
  rawData: BkashGatewayRawResponse,
  fallbackTrxId: string,
): BkashGatewayResult {
  const statusCode = String(rawData.statusCode ?? "");
  const statusMessage = String(rawData.statusMessage ?? "");
  const transactionStatus = String(rawData.transactionStatus ?? "");
  const trxID = String(rawData.trxID ?? fallbackTrxId);

  const isSuccessful =
    statusCode === "0000" &&
    statusMessage === "Successful" &&
    transactionStatus === "Completed";

  return {
    trxID,
    statusCode,
    statusMessage,
    transactionStatus,
    isSuccessful,
    raw: rawData,
  };
}

function normalizeBkashRefundResult(rawData: BkashGatewayRawResponse): BkashRefundResult {
  const statusCode = String(rawData.statusCode ?? "");
  const statusMessage = String(rawData.statusMessage ?? "");
  const refundTrxID = String(rawData.refundTrxID ?? "");

  const isSuccessful = statusCode === "0000" && statusMessage === "Successful";

  return {
    refundTrxID,
    statusCode,
    statusMessage,
    isSuccessful,
    raw: rawData,
  };
}

function isExecuteTimeoutWithoutResponse(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  if (error.response) {
    return false;
  }

  return error.code === "ECONNABORTED" || error.code === "ETIMEDOUT";
}

export class BkashExecuteTimeoutError extends Error {
  constructor(
    message: string,
    public readonly raw?: unknown,
  ) {
    super(message);
    this.name = "BkashExecuteTimeoutError";
  }
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  if (
    !env.BKASH_BASE_URL ||
    !env.BKASH_USERNAME ||
    !env.BKASH_PASSWORD ||
    !env.BKASH_APP_KEY ||
    !env.BKASH_APP_SECRET
  ) {
    return "";
  }

  const existingCache = await BkashTokenCacheModel.findOne({
    key: TOKEN_CACHE_KEY,
  });

  if (existingCache) {
    const cachedExpiry = existingCache.expires_at.getTime();
    if (isTokenValid(cachedExpiry)) {
      cachedToken = {
        value: existingCache.id_token,
        expiresAt: cachedExpiry,
      };
      return existingCache.id_token;
    }
  }

  const now = Date.now();
  let grantWindowStart = existingCache?.grant_window_start.getTime() ?? now;
  let grantCallCount = existingCache?.grant_call_count ?? 0;

  if (now - grantWindowStart >= ONE_HOUR_MS) {
    grantWindowStart = now;
    grantCallCount = 0;
  }

  if (grantCallCount >= 2) {
    throw new Error("bKash token grant rate limit reached (max 2/hour)");
  }

  const response = await axios.post<BkashGrantTokenResponse>(
    `${env.BKASH_BASE_URL}/tokenized/checkout/token/grant`,
    {
      app_key: env.BKASH_APP_KEY,
      app_secret: env.BKASH_APP_SECRET,
    },
    {
      headers: {
        username: env.BKASH_USERNAME,
        password: env.BKASH_PASSWORD,
      },
      timeout: 15000,
    },
  );

  const expiresAt = Date.now() + env.BKASH_TOKEN_CACHE_TTL * 1000;

  await BkashTokenCacheModel.findOneAndUpdate(
    { key: TOKEN_CACHE_KEY },
    {
      key: TOKEN_CACHE_KEY,
      id_token: response.data.id_token,
      expires_at: new Date(expiresAt),
      grant_window_start: new Date(grantWindowStart),
      grant_call_count: grantCallCount + 1,
    },
    {
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );

  cachedToken = {
    value: response.data.id_token,
    expiresAt,
  };

  return cachedToken.value;
}

export async function bkashCreatePayment(payload: {
  amount: number;
  invoiceNumber: string;
}): Promise<{ paymentID: string; bkashURL: string; mode: "sandbox" | "mock" }> {
  const callbackUrl = resolveBkashCallbackUrl();

  if (!env.BKASH_BASE_URL) {
    if (!canUseMockGateway()) {
      throw new Error("bKash gateway is not configured");
    }

    return {
      paymentID: `mock_${payload.invoiceNumber}`,
      bkashURL: `${callbackUrl}?status=success&invoice=${payload.invoiceNumber}`,
      mode: "mock",
    };
  }

  try {
    const token = await getAccessToken();

    const response = await axios.post(
      `${env.BKASH_BASE_URL}/tokenized/checkout/create`,
      {
        mode: "0011",
        payerReference: payload.invoiceNumber,
        callbackURL: callbackUrl,
        amount: payload.amount.toFixed(2),
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: payload.invoiceNumber,
      },
      {
        headers: {
          authorization: token,
          "x-app-key": env.BKASH_APP_KEY,
        },
      },
    );

    return {
      paymentID: response.data.paymentID,
      bkashURL: response.data.bkashURL,
      mode: "sandbox",
    };
  } catch (error) {
    if (!canUseMockGateway()) {
      throw error;
    }

    logger.warn("bKash create payment failed, falling back to mock mode");
    return {
      paymentID: `mock_${payload.invoiceNumber}`,
      bkashURL: `${callbackUrl}?status=failed&invoice=${payload.invoiceNumber}`,
      mode: "mock",
    };
  }
}

export async function bkashExecutePayment(paymentID: string): Promise<{
  trxID: string;
  statusCode: string;
  statusMessage: string;
  transactionStatus: string;
  isSuccessful: boolean;
  raw: unknown;
}> {
  if (!env.BKASH_BASE_URL) {
    if (!canUseMockGateway()) {
      throw new Error("bKash gateway is not configured");
    }

    const statusCode = "0000";
    const statusMessage = "Successful";
    const transactionStatus = "Completed";

    return {
      trxID: `TRX-${paymentID}`.slice(0, 24),
      statusCode,
      statusMessage,
      transactionStatus,
      isSuccessful: true,
      raw: { mode: "mock" },
    };
  }

  const token = await getAccessToken();
  try {
    const response = await axios.post(
      `${env.BKASH_BASE_URL}/tokenized/checkout/execute`,
      { paymentID },
      {
        headers: {
          authorization: token,
          "x-app-key": env.BKASH_APP_KEY,
        },
        timeout: 15000,
      },
    );

    return normalizeBkashResult(response.data, paymentID);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) {
      return normalizeBkashResult(
        error.response.data as BkashGatewayRawResponse,
        paymentID,
      );
    }

    if (isExecuteTimeoutWithoutResponse(error)) {
      throw new BkashExecuteTimeoutError(
        "Execute API timeout without response",
        error,
      );
    }

    throw error;
  }
}

export async function bkashQueryPayment(paymentID: string): Promise<BkashGatewayResult> {
  if (!env.BKASH_BASE_URL) {
    if (!canUseMockGateway()) {
      throw new Error("bKash gateway is not configured");
    }

    return normalizeBkashResult(
      {
        trxID: `TRX-${paymentID}`.slice(0, 24),
        statusCode: "0000",
        statusMessage: "Successful",
        transactionStatus: "Completed",
      },
      paymentID,
    );
  }

  const token = await getAccessToken();

  try {
    const response = await axios.post(
      `${env.BKASH_BASE_URL}/tokenized/checkout/payment/status`,
      { paymentID },
      {
        headers: {
          authorization: token,
          "x-app-key": env.BKASH_APP_KEY,
        },
        timeout: 15000,
      },
    );

    return normalizeBkashResult(response.data, paymentID);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) {
      return normalizeBkashResult(
        error.response.data as BkashGatewayRawResponse,
        paymentID,
      );
    }

    throw error;
  }
}

export async function bkashRefundPayment(payload: {
  paymentID: string;
  trxID: string;
  amount: number;
  reason: string;
  sku?: string;
}): Promise<BkashRefundResult> {
  if (!env.BKASH_BASE_URL) {
    if (!canUseMockGateway()) {
      throw new Error("bKash gateway is not configured");
    }

    return normalizeBkashRefundResult({
      refundTrxID: `RFND-${payload.trxID}`.slice(0, 30),
      statusCode: "0000",
      statusMessage: "Successful",
    });
  }

  const token = await getAccessToken();

  try {
    const response = await axios.post(
      `${env.BKASH_BASE_URL}/tokenized/checkout/payment/refund`,
      {
        paymentID: payload.paymentID,
        trxID: payload.trxID,
        amount: payload.amount.toFixed(2),
        reason: payload.reason,
        sku: payload.sku ?? "course",
      },
      {
        headers: {
          authorization: token,
          "x-app-key": env.BKASH_APP_KEY,
        },
        timeout: 15000,
      },
    );

    return normalizeBkashRefundResult(response.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) {
      return normalizeBkashRefundResult(error.response.data as BkashGatewayRawResponse);
    }

    logger.error("bKash refund failed without response", error as Error);
    throw error;
  }
}
