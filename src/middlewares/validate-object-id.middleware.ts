import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../errors/app-error";

export function validateObjectId(paramName: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const value = req.params[paramName];

    if (!mongoose.Types.ObjectId.isValid(value)) {
      next(new AppError(StatusCodes.BAD_REQUEST, `Invalid ${paramName}`));
      return;
    }

    next();
  };
}

