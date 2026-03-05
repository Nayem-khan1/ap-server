import { Router } from "express";
import { validateObjectId } from "../../middlewares/validate-object-id.middleware";
import { validateRequest } from "../../middlewares/validate-request.middleware";
import { eventController } from "./controller";
import { eventValidation } from "./schema";

const eventRouter = Router();
eventRouter.get("/", eventController.listEvents);
eventRouter.get("/registrations", eventController.listEventRegistrations);
eventRouter.post("/", validateRequest(eventValidation.create), eventController.createEvent);
eventRouter.patch(
  "/:id",
  validateObjectId("id"),
  validateRequest(eventValidation.update),
  eventController.updateEvent,
);
eventRouter.patch(
  "/:id/status",
  validateObjectId("id"),
  validateRequest(eventValidation.updateStatus),
  eventController.setPublishStatus,
);
eventRouter.delete("/", validateRequest(eventValidation.bulkDelete), eventController.bulkDelete);
eventRouter.patch(
  "/registrations/:id/payment-status",
  validateObjectId("id"),
  validateRequest(eventValidation.updateRegistrationStatus),
  eventController.updateRegistrationPaymentStatus,
);

export { eventRouter };

