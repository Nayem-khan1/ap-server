import { NextFunction, Request, Response } from "express";
import { Error as MongooseError } from "mongoose";
import { ZodError } from "zod";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../errors/app-error";
import { sendResponse } from "../utils/send-response";
import { logger } from "../config/logger";

export function errorMiddleware(
  error: unknown,
  _req: Request,
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
  } else if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  ) {
    statusCode = StatusCodes.CONFLICT;
    message = "Duplicate value found";
    details = error;
  } else if (error instanceof Error) {
    message = error.message || message;
  }

  logger.error(message, error instanceof Error ? error : undefined);

  sendResponse({
    res,
    statusCode,
    success: false,
    message,
    errors: details,
  });
}

