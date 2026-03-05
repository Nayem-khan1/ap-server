import { Router } from "express";
import { validateRequest } from "../../middlewares/validate-request.middleware";
import { settingsController } from "./controller";
import { settingsValidation } from "./schema";

const settingsRouter = Router();
settingsRouter.get("/", settingsController.getSettings);
settingsRouter.get("/platform", settingsController.getPlatform);
settingsRouter.patch(
  "/platform",
  validateRequest(settingsValidation.updatePlatform),
  settingsController.updatePlatform,
);
settingsRouter.get("/seo", settingsController.getSeo);
settingsRouter.patch(
  "/seo",
  validateRequest(settingsValidation.updateSeo),
  settingsController.updateSeo,
);

export { settingsRouter };

