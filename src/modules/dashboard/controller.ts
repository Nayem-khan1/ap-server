import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../utils/catch-async";
import { sendResponse } from "../../utils/send-response";
import { dashboardService } from "./service";

export const dashboardController = {
  analytics: catchAsync(async (_req: Request, res: Response) => {
    const data = await dashboardService.getAnalytics();
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Dashboard analytics fetched successfully",
      data,
    });
  }),
};

