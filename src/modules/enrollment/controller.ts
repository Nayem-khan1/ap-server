import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../utils/catch-async";
import { sendResponse } from "../../utils/send-response";
import { enrollmentService } from "./service";

export const enrollmentController = {
  listEnrollments: catchAsync(async (req: Request, res: Response) => {
    const data = await enrollmentService.listEnrollments(req.query as Record<string, unknown>);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Enrollments fetched successfully",
      data,
    });
  }),

  listProgress: catchAsync(async (_req: Request, res: Response) => {
    const data = await enrollmentService.listProgress();
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Progress records fetched successfully",
      data,
    });
  }),

  previewManualEnrollment: catchAsync(async (req: Request, res: Response) => {
    const data = await enrollmentService.previewManualEnrollment(req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Manual enrollment pricing preview generated successfully",
      data,
    });
  }),

  manualEnroll: catchAsync(async (req: Request, res: Response) => {
    const data = await enrollmentService.manualEnroll({
      ...req.body,
      verified_by_user_id: req.user?.userId,
    });
    return sendResponse({
      res,
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Student enrolled successfully",
      data,
    });
  }),

  unlockLesson: catchAsync(async (req: Request, res: Response) => {
    const data = await enrollmentService.unlockLesson(req.params.id);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Lesson unlocked successfully",
      data,
    });
  }),

  resetProgress: catchAsync(async (req: Request, res: Response) => {
    const data = await enrollmentService.resetProgress(req.params.id);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Progress reset successfully",
      data,
    });
  }),

  setStatus: catchAsync(async (req: Request, res: Response) => {
    const data = await enrollmentService.setStatus(req.params.id, req.body.status);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Enrollment status updated successfully",
      data,
    });
  }),

  bulkDelete: catchAsync(async (req: Request, res: Response) => {
    const data = await enrollmentService.bulkDelete(req.body.ids);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Enrollments deleted successfully",
      data,
    });
  }),
};
