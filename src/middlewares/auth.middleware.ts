import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../errors/app-error";
import { verifyAccessToken } from "../utils/token";
import { UserRole, UserModel } from "../modules/user/model";

export function requireAuth(allowedRoles?: UserRole[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const authorization = req.headers.authorization;

      if (!authorization || !authorization.startsWith("Bearer ")) {
        throw new AppError(StatusCodes.UNAUTHORIZED, "Unauthorized");
      }

      const token = authorization.slice(7);
      const decoded = verifyAccessToken(token);

      const user = await UserModel.findById(decoded.userId).select(
        "+tokenVersion role name email",
      );

      if (!user) {
        throw new AppError(StatusCodes.UNAUTHORIZED, "Unauthorized");
      }

      if (decoded.tokenVersion !== user.tokenVersion) {
        throw new AppError(
          StatusCodes.UNAUTHORIZED,
          "Session expired. Please log in again",
        );
      }

      if (allowedRoles && !allowedRoles.includes(user.role)) {
        throw new AppError(StatusCodes.FORBIDDEN, "Forbidden");
      }

      req.user = {
        userId: user.id,
        role: user.role,
        tokenVersion: user.tokenVersion,
      };

      next();
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
        return;
      }

      next(new AppError(StatusCodes.UNAUTHORIZED, "Unauthorized"));
    }
  };
}
