import http from "http";
import { app } from "./app";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { env } from "./config/env";
import { logger } from "./config/logger";

let server: http.Server | undefined;
let isShuttingDown = false;

function closeHttpServer(activeServer: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    activeServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function startServer(): Promise<void> {
  await connectDatabase();

  server = app.listen(env.PORT, env.HOST, () => {
    logger.info(`Server listening on http://${env.HOST}:${env.PORT}`);
  });

  server.keepAliveTimeout = env.SERVER_KEEP_ALIVE_TIMEOUT_MS;
  server.headersTimeout = env.SERVER_HEADERS_TIMEOUT_MS;
  server.requestTimeout = env.SERVER_REQUEST_TIMEOUT_MS;
}

async function shutdown(signal: string, exitCode: number): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info(`${signal} received. Shutting down gracefully.`);

  const shutdownTimer = setTimeout(() => {
    logger.error("Graceful shutdown timed out");
    process.exit(1);
  }, env.SHUTDOWN_GRACE_PERIOD_MS);

  try {
    if (server) {
      await closeHttpServer(server);
    }

    await disconnectDatabase();
    clearTimeout(shutdownTimer);
    process.exit(exitCode);
  } catch (error) {
    clearTimeout(shutdownTimer);
    logger.error("Graceful shutdown failed", error as Error);
    process.exit(1);
  }
}

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", error);
  void shutdown("uncaughtException", 1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", reason as Error);
  void shutdown("unhandledRejection", 1);
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM", 0);
});

process.on("SIGINT", () => {
  void shutdown("SIGINT", 0);
});

startServer().catch((error) => {
  logger.error("Failed to start server", error);
  process.exit(1);
});
