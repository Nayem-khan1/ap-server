import { Router } from "express";
import { validateObjectId } from "../../middlewares/validate-object-id.middleware";
import { validateRequest } from "../../middlewares/validate-request.middleware";
import { couponController } from "./controller";
import { couponValidation } from "./schema";

const couponRouter = Router();
couponRouter.get("/", couponController.listCoupons);
couponRouter.post("/", validateRequest(couponValidation.create), couponController.createCoupon);
couponRouter.patch(
  "/:id",
  validateObjectId("id"),
  validateRequest(couponValidation.update),
  couponController.updateCoupon,
);
couponRouter.patch(
  "/:id/active",
  validateObjectId("id"),
  validateRequest(couponValidation.toggle),
  couponController.setCouponActive,
);
couponRouter.delete("/", validateRequest(couponValidation.bulkDelete), couponController.bulkDeleteCoupons);

export { couponRouter };

