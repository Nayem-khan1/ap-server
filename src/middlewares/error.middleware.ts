import { NextFunction, Request, Response } from "express";
import { Error as MongooseError } from "mongoose";
import { ZodError } from "zod";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../errors/app-error";
import { sendResponse } from "../utils/send-response";
import { logger } from "../config/logger";
import { env } from "../config/env";

interface DuplicateKeyError {
  code?: number;
  keyValue?: Record<string, unknown>;
}

function isDuplicateKeyError(error: unknown): error is DuplicateKeyError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as DuplicateKeyError).code === 11000
  );
}

function appendDebugDetails(error: unknown, details: unknown): unknown {
  if (env.IS_PRODUCTION || !(error instanceof Error)) {
    return details;
  }

  if (typeof details === "undefined") {
    return { stack: error.stack };
  }

  return {
    details,
    stack: error.stack,
  };
}

export function errorMiddleware(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  let message = "Internal server error";
  let details: unknown = undefined;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    details = error.details;
  } else if (error instanceof ZodError) {
    statusCode = StatusCodes.BAD_REQUEST;
    message = "Validation failed";
    details = error.flatten();
  } else if (error instanceof MongooseError.ValidationError) {
    statusCode = StatusCodes.BAD_REQUEST;
    message = "Database validation failed";
    details = error.errors;
  } else if (error instanceof MongooseError.CastError) {
    statusCode = StatusCodes.BAD_REQUEST;
    message = "Invalid resource identifier";
    details = { path: error.path };
  } else if (isDuplicateKeyError(error)) {
    statusCode = StatusCodes.CONFLICT;
    message = "Duplicate value found";
    details = { fields: Object.keys(error.keyValue ?? {}) };
  } else if (error instanceof Error) {
    message = env.IS_PRODUCTION ? message : error.message || message;
  }

  const responseMessage =
    env.IS_PRODUCTION && statusCode >= StatusCodes.INTERNAL_SERVER_ERROR
      ? "Internal server error"
      : message;
  const responseDetails =
    env.IS_PRODUCTION && statusCode >= StatusCodes.INTERNAL_SERVER_ERROR
      ? undefined
      : appendDebugDetails(error, details);

  const logMeta = {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error,
  };

  if (statusCode >= StatusCodes.INTERNAL_SERVER_ERROR) {
    logger.error("Request failed", logMeta);
  } else {
    logger.warn("Request rejected", logMeta);
  }

  sendResponse({
    res,
    statusCode,
    success: false,
    message: responseMessage,
    errors: responseDetails,
  });
}
