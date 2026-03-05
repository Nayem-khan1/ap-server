import { Response } from "express";
import { ApiResponse } from "../interfaces/api-response.interface";

interface SendResponseArgs<T> {
  res: Response;
  statusCode: number;
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
}

export function sendResponse<T>({
  res,
  statusCode,
  success,
  message,
  data,
  errors,
}: SendResponseArgs<T>): Response<ApiResponse<T>> {
  const payload: ApiResponse<T> = {
    success,
    message,
  };

  if (typeof data !== "undefined") {
    payload.data = data;
  }

  if (typeof errors !== "undefined") {
    payload.errors = errors;
  }

  return res.status(statusCode).json(payload);
}

