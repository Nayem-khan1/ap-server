import { Router } from "express";
import { validateRequest } from "../../middlewares/validate-request.middleware";
import { analyticsController } from "./controller";
import { analyticsValidation } from "./schema";

const analyticsRouter = Router();

analyticsRouter.get("/summary", analyticsController.summary);
analyticsRouter.get(
  "/revenue-growth",
  validateRequest(analyticsValidation.query),
  analyticsController.revenueGrowth,
);
analyticsRouter.get(
  "/enrollment-growth",
  validateRequest(analyticsValidation.query),
  analyticsController.enrollmentGrowth,
);
analyticsRouter.get(
  "/user-growth",
  validateRequest(analyticsValidation.query),
  analyticsController.userGrowth,
);
analyticsRouter.get(
  "/course-popularity",
  validateRequest(analyticsValidation.query),
  analyticsController.coursePopularity,
);

export { analyticsRouter };

