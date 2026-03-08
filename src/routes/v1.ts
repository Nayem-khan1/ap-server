import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { sendResponse } from "../utils/send-response";
import { studentAuthRouter } from "../modules/auth/auth.route";
import { publicRoutes } from "../modules/public/public.route";
import { paymentGatewayRouter } from "../modules/payment/route";
import { uploadRouter } from "../modules/upload/route";
import { adminRouter } from "./admin";

import { studentRouter } from "../modules/student/route";

const router = Router();

router.get("/health", (_req, res) => {
  return sendResponse({
    res,
    statusCode: StatusCodes.OK,
    success: true,
    message: "API is healthy",
    data: { timestamp: new Date().toISOString() },
  });
});

router.use("/auth", studentAuthRouter);

router.use("/admin", adminRouter);
router.use("/student", studentRouter);
router.use("/", publicRoutes);
router.use("/public", publicRoutes);
router.use("/payments", paymentGatewayRouter);
router.use("/upload", uploadRouter);

export const v1Routes = router;
