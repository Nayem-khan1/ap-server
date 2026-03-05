import { Router } from "express";
import { validateObjectId } from "../../middlewares/validate-object-id.middleware";
import { validateRequest } from "../../middlewares/validate-request.middleware";
import { certificateController } from "./controller";
import { certificateValidation } from "./schema";

const certificateRouter = Router();

certificateRouter.get("/eligibility", certificateController.listEligibility);
certificateRouter.patch(
  "/eligibility/:id",
  validateObjectId("id"),
  validateRequest(certificateValidation.eligibilityUpdate),
  certificateController.updateEligibility,
);

certificateRouter.get("/templates", certificateController.listTemplates);
certificateRouter.post(
  "/templates",
  validateRequest(certificateValidation.templateCreate),
  certificateController.createTemplate,
);
certificateRouter.patch(
  "/templates/:id",
  validateObjectId("id"),
  validateRequest(certificateValidation.templateUpdate),
  certificateController.updateTemplate,
);
certificateRouter.patch(
  "/templates/:id/status",
  validateObjectId("id"),
  validateRequest(certificateValidation.templateStatus),
  certificateController.setTemplatePublishStatus,
);
certificateRouter.delete(
  "/templates",
  validateRequest(certificateValidation.templateBulkDelete),
  certificateController.bulkDeleteTemplates,
);

certificateRouter.get("/", certificateController.listIssued);
certificateRouter.post(
  "/generate",
  validateRequest(certificateValidation.issuedGenerate),
  certificateController.generateIssued,
);
certificateRouter.patch(
  "/:id/verification-status",
  validateObjectId("id"),
  validateRequest(certificateValidation.issuedStatusUpdate),
  certificateController.setIssuedVerificationStatus,
);
certificateRouter.get(
  "/:id/pdf",
  validateObjectId("id"),
  validateRequest(certificateValidation.issuedPdf),
  certificateController.generateIssuedPdf,
);
certificateRouter.post(
  "/verify",
  validateRequest(certificateValidation.verifyByCode),
  certificateController.verifyByCertificateNo,
);

export { certificateRouter };
