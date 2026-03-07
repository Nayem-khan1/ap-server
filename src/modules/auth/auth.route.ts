import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authController } from "./auth.controller";
import { authValidation } from "./auth.validation";
import { validateRequest } from "../../middlewares/validate-request.middleware";
import { requireAuth } from "../../middlewares/auth.middleware";

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const otpRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
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
