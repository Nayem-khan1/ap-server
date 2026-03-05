import { Router } from "express";
import { validateRequest } from "../../middlewares/validate-request.middleware";
import { dashboardController } from "./controller";
import { dashboardValidation } from "./schema";

const dashboardRouter = Router();
dashboardRouter.get(
  "/analytics",
  validateRequest(dashboardValidation.analyticsQuery),
  dashboardController.analytics,
);

export { dashboardRouter };

