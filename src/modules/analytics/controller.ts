import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../utils/catch-async";
import { sendResponse } from "../../utils/send-response";
import { analyticsService } from "./service";

type AnalyticsRange = "7d" | "30d" | "90d" | "12m";

function getRange(value: unknown): AnalyticsRange {
  if (value === "7d" || value === "30d" || value === "90d") return value;
  return "12m";
}

export const analyticsController = {
  summary: catchAsync(async (_req: Request, res: Response) => {
    const data = await analyticsService.summary();
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Analytics summary fetched successfully",
      data,
    });
  }),

  revenueGrowth: catchAsync(async (req: Request, res: Response) => {
    const data = await analyticsService.revenueGrowth(getRange(req.query.range));
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Revenue growth fetched successfully",
      data,
    });
  }),

  enrollmentGrowth: catchAsync(async (req: Request, res: Response) => {
    const data = await analyticsService.enrollmentGrowth(getRange(req.query.range));
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Enrollment growth fetched successfully",
      data,
    });
  }),

  userGrowth: catchAsync(async (req: Request, res: Response) => {
    const data = await analyticsService.userGrowth(getRange(req.query.range));
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "User growth fetched successfully",
      data,
    });
  }),

  coursePopularity: catchAsync(async (req: Request, res: Response) => {
    const data = await analyticsService.coursePopularity(getRange(req.query.range));
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Course popularity fetched successfully",
      data,
    });
  }),
};

