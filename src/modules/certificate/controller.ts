import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../utils/catch-async";
import { sendResponse } from "../../utils/send-response";
import { certificateService } from "./service";

export const certificateController = {
  listEligibility: catchAsync(async (_req: Request, res: Response) => {
    const data = await certificateService.listEligibility();
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Certificate eligibility fetched successfully",
      data,
    });
  }),

  updateEligibility: catchAsync(async (req: Request, res: Response) => {
    const data = await certificateService.updateEligibility(req.params.id, req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Certificate eligibility updated successfully",
      data,
    });
  }),

  listTemplates: catchAsync(async (_req: Request, res: Response) => {
    const data = await certificateService.listTemplates();
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Certificate templates fetched successfully",
      data,
    });
  }),

  createTemplate: catchAsync(async (req: Request, res: Response) => {
    const data = await certificateService.createTemplate(req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Certificate template created successfully",
      data,
    });
  }),

  updateTemplate: catchAsync(async (req: Request, res: Response) => {
    const data = await certificateService.updateTemplate(req.params.id, req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Certificate template updated successfully",
      data,
    });
  }),

  setTemplatePublishStatus: catchAsync(async (req: Request, res: Response) => {
    const data = await certificateService.setTemplatePublishStatus(
      req.params.id,
      req.body.publish_status,
    );
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Template status updated successfully",
      data,
    });
  }),

  bulkDeleteTemplates: catchAsync(async (req: Request, res: Response) => {
    const data = await certificateService.bulkDeleteTemplates(req.body.ids);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Certificate templates deleted successfully",
      data,
    });
  }),

  listIssued: catchAsync(async (_req: Request, res: Response) => {
    const data = await certificateService.listIssued();
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Issued certificates fetched successfully",
      data,
    });
  }),

  generateIssued: catchAsync(async (req: Request, res: Response) => {
    const data = await certificateService.generateIssued(req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Certificate issued successfully",
      data,
    });
  }),

  setIssuedVerificationStatus: catchAsync(async (req: Request, res: Response) => {
    const data = await certificateService.setIssuedVerificationStatus(
      req.params.id,
      req.body.verification_status,
    );
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Issued certificate verification status updated successfully",
      data,
    });
  }),

  generateIssuedPdf: catchAsync(async (req: Request, res: Response) => {
    const data = await certificateService.generateIssuedPdf(req.params.id);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Certificate PDF generated successfully",
      data,
    });
  }),

  verifyByCertificateNo: catchAsync(async (req: Request, res: Response) => {
    const data = await certificateService.verifyByCertificateNo(req.body.certificate_no);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: data ? "Certificate verified" : "Certificate not found",
      data,
    });
  }),
};
