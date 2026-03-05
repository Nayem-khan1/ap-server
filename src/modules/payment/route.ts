import { Router } from "express";
import { validateObjectId } from "../../middlewares/validate-object-id.middleware";
import { validateRequest } from "../../middlewares/validate-request.middleware";
import { paymentController } from "./controller";
import { paymentValidation } from "./schema";

const paymentRouter = Router();
paymentRouter.get("/", paymentController.listPayments);
paymentRouter.patch(
  "/:id/verify",
  validateObjectId("id"),
  validateRequest(paymentValidation.verify),
  paymentController.verifyPayment,
);
paymentRouter.patch(
  "/:id/status",
  validateObjectId("id"),
  validateRequest(paymentValidation.updateStatus),
  paymentController.updatePaymentStatus,
);
paymentRouter.patch(
  "/:id/unlock-enrollment",
  validateObjectId("id"),
  validateRequest(paymentValidation.paymentId),
  paymentController.unlockEnrollment,
);
paymentRouter.delete(
  "/",
  validateRequest(paymentValidation.bulkDelete),
  paymentController.bulkDeletePayments,
);

const paymentGatewayRouter = Router();
paymentGatewayRouter.post(
  "/bkash/init",
  validateRequest(paymentValidation.bkashInit),
  paymentController.initBkashPayment,
);
paymentGatewayRouter.post(
  "/bkash/create",
  validateRequest(paymentValidation.bkashCreate),
  paymentController.createBkashPayment,
);
paymentGatewayRouter.post(
  "/bkash/callback",
  validateRequest(paymentValidation.bkashCallbackBody),
  paymentController.bkashCallback,
);
paymentGatewayRouter.get(
  "/bkash/callback",
  validateRequest(paymentValidation.bkashCallback),
  paymentController.bkashCallback,
);
paymentGatewayRouter.post(
  "/bkash/execute",
  validateRequest(paymentValidation.bkashExecute),
  paymentController.executeBkashPayment,
);

export { paymentRouter, paymentGatewayRouter };
