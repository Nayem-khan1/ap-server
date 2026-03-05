import { createLogger, format, transports } from "winston";
import { env } from "./env";

const jsonFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.json(),
);

const devFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.printf(({ level, message, timestamp, stack }) => {
    if (stack) {
      return `${timestamp} ${level}: ${message}\n${stack}`;
    }

    return `${timestamp} ${level}: ${message}`;
  }),
);

export const logger = createLogger({
  level: env.LOG_LEVEL,
  format: env.NODE_ENV === "production" ? jsonFormat : devFormat,
  transports: [new transports.Console()],
});

export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

