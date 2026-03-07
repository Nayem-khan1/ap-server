import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../utils/catch-async";
import { sendResponse } from "../../utils/send-response";
import { authService } from "./auth.service";
import { AppError } from "../../errors/app-error";
import { parseDurationToMs } from "../../utils/duration";
import { env } from "../../config/env";

const REFRESH_COOKIE = "lms_refresh_token";
const refreshCookieMaxAgeMs = parseDurationToMs(
  env.JWT_REFRESH_EXPIRES_IN,
  7 * 24 * 60 * 60 * 1000,
);

export const authController = {
  studentRegister: catchAsync(async (req: Request, res: Response) => {
    const result = await authService.registerStudent(req.body);

    res.cookie(REFRESH_COOKIE, result.refresh_token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: refreshCookieMaxAgeMs,
    });

    return sendResponse({
      res,
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Registration successful",
      data: result,
    });
  }),

  studentLogin: catchAsync(async (req: Request, res: Response) => {
    const result = await authService.loginStudent(req.body);

    res.cookie(REFRESH_COOKIE, result.refresh_token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: refreshCookieMaxAgeMs,
    });

    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Login successful",
      data: result,
    });
  }),

  adminLogin: catchAsync(async (req: Request, res: Response) => {
    const result = await authService.loginAdmin(req.body);

    res.cookie(REFRESH_COOKIE, result.refresh_token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: refreshCookieMaxAgeMs,
    });

    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Login successful",
      data: result,
    });
  }),

  forgotPassword: catchAsync(async (req: Request, res: Response) => {
    await authService.forgotPassword(req.body);

    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message:
        "If the account exists, an OTP has been sent to the registered email",
    });
  }),

  verifyOtp: catchAsync(async (req: Request, res: Response) => {
    const data = await authService.verifyOtp(req.body);

    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "OTP verified successfully",
      data,
    });
  }),

  resetPassword: catchAsync(async (req: Request, res: Response) => {
    const resetToken = req.header("x-reset-token") || req.body.reset_token;

    if (!resetToken) {
      throw new AppError(
        StatusCodes.UNAUTHORIZED,
        "Reset token is required in x-reset-token header",
      );
    }

    await authService.resetPassword(req.body, resetToken);

    res.clearCookie(REFRESH_COOKIE);

    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Password reset successful",
    });
  }),

  getProfile: catchAsync(async (req: Request, res: Response) => {
    const user = req.user;

    if (!user) {
      throw new AppError(StatusCodes.UNAUTHORIZED, "Unauthorized");
    }

    const data = await authService.getProfile(user.userId);

    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Profile fetched successfully",
      data,
    });
  }),
};
