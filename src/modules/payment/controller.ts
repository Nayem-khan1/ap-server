import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../utils/catch-async";
import { sendResponse } from "../../utils/send-response";
import { paymentService } from "./service";

export const paymentController = {
  listPayments: catchAsync(async (req: Request, res: Response) => {
    const data = await paymentService.listPayments(req.query as Record<string, unknown>);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Payments fetched successfully",
      data,
    });
  }),

  verifyPayment: catchAsync(async (req: Request, res: Response) => {
    const data = await paymentService.verifyPayment(req.params.id, req.body.verifierName);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Payment verified successfully",
      data,
    });
  }),

  updatePaymentStatus: catchAsync(async (req: Request, res: Response) => {
    const data = await paymentService.updatePaymentStatus(
      req.params.id,
      req.body.status,
      req.body.verifierName,
    );
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Payment status updated successfully",
      data,
    });
  }),

  unlockEnrollment: catchAsync(async (req: Request, res: Response) => {
    const data = await paymentService.unlockEnrollment(req.params.id);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Enrollment unlocked successfully",
      data,
    });
  }),

  bulkDeletePayments: catchAsync(async (req: Request, res: Response) => {
    const data = await paymentService.bulkDelete(req.body.ids);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Payments deleted successfully",
      data,
    });
  }),

  initBkashPayment: catchAsync(async (req: Request, res: Response) => {
    const data = await paymentService.initBkashPayment(req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "bKash payment initialized",
      data,
    });
  }),

  createBkashPayment: catchAsync(async (req: Request, res: Response) => {
    const data = await paymentService.initBkashPayment(req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "bKash payment created",
      data,
    });
  }),

  bkashCallback: catchAsync(async (req: Request, res: Response) => {
    const callbackPayload = {
      ...(req.query as Record<string, string | undefined>),
      ...(req.body as Record<string, string | undefined>),
    };
    const data = await paymentService.handleBkashCallback(callbackPayload);

    if (
      data &&
      typeof data === "object" &&
      "redirect_url" in data &&
      typeof data.redirect_url === "string" &&
      data.redirect_url.trim()
    ) {
      return res.redirect(302, data.redirect_url);
    }

    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "bKash callback processed",
      data,
    });
  }),

  executeBkashPayment: catchAsync(async (req: Request, res: Response) => {
    const data = await paymentService.executeBkashPayment(req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "bKash payment executed",
      data,
    });
  }),
};
