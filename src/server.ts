import http from "http";
import { app } from "./app";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { env } from "./config/env";
import { logger } from "./config/logger";

let server: http.Server | undefined;
let isShuttingDown = false;

interface ListenError extends NodeJS.ErrnoException {
  address?: string;
  port?: number;
}

function formatError(error: unknown): unknown {
  if (!(error instanceof Error)) {
    return error;
  }

  const errorWithCode = error as ListenError;

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    code: errorWithCode.code,
    syscall: errorWithCode.syscall,
    address: errorWithCode.address,
    port: errorWithCode.port,
  };
}

function closeHttpServer(activeServer: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    activeServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
    activeServer.closeIdleConnections?.();
  });
}

function listen(activeServer: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    function cleanup(): void {
      activeServer.off("error", onError);
      activeServer.off("listening", onListening);
    }

    function onError(error: NodeJS.ErrnoException): void {
      cleanup();
      reject(error);
    }

    function onListening(): void {
      cleanup();
      resolve();
    }

    activeServer.once("error", onError);
    activeServer.once("listening", onListening);

    try {
      activeServer.listen(env.PORT, env.HOST);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

async function startServer(): Promise<void> {
  await connectDatabase();

  server = http.createServer(app);
  server.keepAliveTimeout = env.SERVER_KEEP_ALIVE_TIMEOUT_MS;
  server.headersTimeout = env.SERVER_HEADERS_TIMEOUT_MS;
  server.requestTimeout = env.SERVER_REQUEST_TIMEOUT_MS;

  await listen(server);

  logger.info(`Server listening on http://${env.HOST}:${env.PORT}`, {
    host: env.HOST,
    port: env.PORT,
    pid: process.pid,
    environment: env.NODE_ENV,
  });
}

async function shutdown(signal: string, exitCode: number): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info(`${signal} received. Shutting down gracefully.`);

  const shutdownTimer = setTimeout(() => {
    logger.error("Graceful shutdown timed out", {
      signal,
      timeoutMs: env.SHUTDOWN_GRACE_PERIOD_MS,
    });
    server?.closeAllConnections?.();
    process.exit(1);
  }, env.SHUTDOWN_GRACE_PERIOD_MS);
  shutdownTimer.unref();

  try {
    if (server) {
      await closeHttpServer(server);
    }

    await disconnectDatabase();
    clearTimeout(shutdownTimer);
    process.exit(exitCode);
  } catch (error) {
    clearTimeout(shutdownTimer);
    logger.error("Graceful shutdown failed", { error: formatError(error) });
    process.exit(1);
  }
}

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", { error: formatError(error) });
  void shutdown("uncaughtException", 1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", { error: formatError(reason) });
  void shutdown("unhandledRejection", 1);
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM", 0);
});

process.on("SIGINT", () => {
  void shutdown("SIGINT", 0);
});

startServer().catch((error) => {
  const errorWithCode = error as NodeJS.ErrnoException;
  const message =
    errorWithCode.code === "EADDRINUSE"
      ? `Failed to start server: ${env.HOST}:${env.PORT} is already in use`
      : "Failed to start server";

  logger.error(message, {
    error: formatError(error),
    host: env.HOST,
    port: env.PORT,
    pid: process.pid,
  });
  process.exit(1);
});
