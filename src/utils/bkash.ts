import axios from "axios";
import { env } from "../config/env";
import { logger } from "../config/logger";

interface BkashGrantTokenResponse {
  id_token: string;
}

let cachedToken: { value: string; expiresAt: number } | null = null;
let grantTokenWindow: { windowStart: number; count: number } = {
  windowStart: 0,
  count: 0,
};

function resolveBkashCallbackUrl(): string {
  if (env.BKASH_CALLBACK_URL.trim()) {
    return env.BKASH_CALLBACK_URL.trim();
  }

  if (env.BKASH_WEBHOOK.trim()) {
    return env.BKASH_WEBHOOK.trim();
  }

  return `http://localhost:${env.PORT}/api/v1/payments/bkash/callback`;
}

function assertGrantTokenRateLimit(): void {
  const now = Date.now();
  const oneHourMs = 60 * 60 * 1000;

  if (!grantTokenWindow.windowStart || now - grantTokenWindow.windowStart >= oneHourMs) {
    grantTokenWindow = { windowStart: now, count: 0 };
  }

  if (grantTokenWindow.count >= 2) {
    throw new Error("bKash token grant rate limit reached (max 2/hour)");
  }

  grantTokenWindow.count += 1;
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

  assertGrantTokenRateLimit();

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
    },
  );

  cachedToken = {
    value: response.data.id_token,
    expiresAt: Date.now() + env.BKASH_TOKEN_CACHE_TTL * 1000,
  };

  return cachedToken.value;
}

export async function bkashCreatePayment(payload: {
  amount: number;
  invoiceNumber: string;
}): Promise<{ paymentID: string; bkashURL: string; mode: "sandbox" | "mock" }> {
  const callbackUrl = resolveBkashCallbackUrl();

  if (!env.BKASH_BASE_URL) {
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
  const response = await axios.post(
    `${env.BKASH_BASE_URL}/tokenized/checkout/execute`,
    { paymentID },
    {
      headers: {
        authorization: token,
        "x-app-key": env.BKASH_APP_KEY,
      },
    },
  );

  const statusCode = String(response.data.statusCode ?? "");
  const statusMessage = String(response.data.statusMessage ?? "");
  const transactionStatus = String(response.data.transactionStatus ?? "");

  const isSuccessful =
    statusCode === "0000" &&
    statusMessage === "Successful" &&
    transactionStatus === "Completed";

  return {
    trxID: String(response.data.trxID ?? paymentID),
    statusCode,
    statusMessage,
    transactionStatus,
    isSuccessful,
    raw: response.data,
  };
}
