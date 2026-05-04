import cookieParser from "cookie-parser";
import cors, { CorsOptions } from "cors";
import express from "express";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { StatusCodes } from "http-status-codes";
import morgan from "morgan";
import xss from "xss-clean";
import { env } from "./config/env";
import { httpLogFormat, morganStream } from "./config/logger";
import { AppError } from "./errors/app-error";
import { errorMiddleware } from "./middlewares/error.middleware";
import { notFoundMiddleware } from "./middlewares/not-found.middleware";
import { v1Routes } from "./routes/v1";
import { sendResponse } from "./utils/send-response";

const app = express();

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (!env.IS_PRODUCTION && env.CORS_ORIGINS.includes("*")) {
      callback(null, true);
      return;
    }

    if (env.CORS_ORIGINS.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new AppError(StatusCodes.FORBIDDEN, "CORS origin is not allowed"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type", "X-Reset-Token"],
  maxAge: env.IS_PRODUCTION ? 24 * 60 * 60 : 10 * 60,
};

const globalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: (req) => req.path === "/api/v1/health",
  handler: (_req, res) => {
    sendResponse({
      res,
      statusCode: StatusCodes.TOO_MANY_REQUESTS,
      success: false,
      message: "Too many requests. Please try again later.",
    });
  },
});

app.disable("x-powered-by");
app.set("trust proxy", env.TRUST_PROXY);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: env.IS_PRODUCTION
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        }
      : false,
    referrerPolicy: { policy: "no-referrer" },
  }),
);
app.use(cors(corsOptions));
app.use(globalLimiter);
app.use(
  morgan(httpLogFormat, {
    skip: (req) => env.IS_PRODUCTION && req.path === "/api/v1/health",
    stream: morganStream,
  }),
);
app.use(express.json({ limit: env.JSON_BODY_LIMIT }));
app.use(
  express.urlencoded({
    extended: true,
    limit: env.URLENCODED_BODY_LIMIT,
    parameterLimit: env.URLENCODED_PARAMETER_LIMIT,
  }),
);
app.use(cookieParser());
app.use(mongoSanitize());
app.use(xss() as express.RequestHandler);

app.use("/api/v1", v1Routes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export { app };
