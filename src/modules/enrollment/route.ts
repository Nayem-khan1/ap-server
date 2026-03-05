import { Router } from "express";
import { validateObjectId } from "../../middlewares/validate-object-id.middleware";
import { validateRequest } from "../../middlewares/validate-request.middleware";
import { enrollmentController } from "./controller";
import { enrollmentValidation } from "./schema";

const enrollmentRouter = Router();
enrollmentRouter.get("/", enrollmentController.listEnrollments);
enrollmentRouter.post(
  "/manual",
  validateRequest(enrollmentValidation.manualEnroll),
  enrollmentController.manualEnroll,
);
enrollmentRouter.patch(
  "/:id/unlock-lesson",
  validateObjectId("id"),
  validateRequest(enrollmentValidation.enrollmentId),
  enrollmentController.unlockLesson,
);
enrollmentRouter.patch(
  "/:id/reset-progress",
  validateObjectId("id"),
  validateRequest(enrollmentValidation.enrollmentId),
  enrollmentController.resetProgress,
);
enrollmentRouter.patch(
  "/:id/status",
  validateObjectId("id"),
  validateRequest(enrollmentValidation.statusUpdate),
  enrollmentController.setStatus,
);
enrollmentRouter.delete("/", validateRequest(enrollmentValidation.bulkDelete), enrollmentController.bulkDelete);

const progressRouter = Router();
progressRouter.get("/", enrollmentController.listProgress);

export { enrollmentRouter, progressRouter };

