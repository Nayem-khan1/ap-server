import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../../config/env";
import { authController } from "./auth.controller";
import { authValidation } from "./auth.validation";
import { validateRequest } from "../../middlewares/validate-request.middleware";
import { requireAuth } from "../../middlewares/auth.middleware";

const loginRateLimiter = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later.",
    data: null,
  },
});

const otpRateLimiter = rateLimit({
  windowMs: env.OTP_RATE_LIMIT_WINDOW_MS,
  limit: env.OTP_RATE_LIMIT_MAX,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many OTP requests. Please try again later.",
    data: null,
  },
});

const studentAuthRouter = Router();
studentAuthRouter.post(
  "/register",
  loginRateLimiter,
  validateRequest(authValidation.studentRegister),
  authController.studentRegister,
);
studentAuthRouter.post(
  "/login",
  loginRateLimiter,
  validateRequest(authValidation.studentLogin),
  authController.studentLogin,
);
studentAuthRouter.post(
  "/forgot-password",
  otpRateLimiter,
  validateRequest(authValidation.forgotPassword),
  authController.forgotPassword,
);
studentAuthRouter.post(
  "/verify-otp",
  otpRateLimiter,
  validateRequest(authValidation.verifyOtp),
  authController.verifyOtp,
);
studentAuthRouter.post(
  "/reset-password",
  otpRateLimiter,
  validateRequest(authValidation.resetPassword),
  authController.resetPassword,
);
studentAuthRouter.get("/profile", requireAuth(["student"]), authController.getProfile);

const adminAuthRouter = Router();
adminAuthRouter.post(
  "/login",
  loginRateLimiter,
  validateRequest(authValidation.adminLogin),
  authController.adminLogin,
);
adminAuthRouter.get(
  "/me",
  requireAuth(["super_admin", "admin", "instructor"]),
  authController.getProfile,
);

export { studentAuthRouter, adminAuthRouter };
