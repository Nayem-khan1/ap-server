import http from "http";
import { app } from "./app";
import { connectDatabase } from "./config/database";
import { env } from "./config/env";
import { logger } from "./config/logger";

let server: http.Server;

async function startServer(): Promise<void> {
  await connectDatabase();

  server = app.listen(env.PORT, () => {
    logger.info(`Server listening on port ${env.PORT}`);
  });
}

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", reason as Error);

  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

startServer().catch((error) => {
  logger.error("Failed to start server", error);
  process.exit(1);
});

