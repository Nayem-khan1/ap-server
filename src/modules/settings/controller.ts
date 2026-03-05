import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../utils/catch-async";
import { sendResponse } from "../../utils/send-response";
import { settingsService } from "./service";

export const settingsController = {
  getSettings: catchAsync(async (_req: Request, res: Response) => {
    const data = await settingsService.getSettings();
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Settings fetched successfully",
      data,
    });
  }),

  getPlatform: catchAsync(async (_req: Request, res: Response) => {
    const data = await settingsService.getPlatform();
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Platform settings fetched successfully",
      data,
    });
  }),

  updatePlatform: catchAsync(async (req: Request, res: Response) => {
    const data = await settingsService.updatePlatform(req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Platform settings updated successfully",
      data,
    });
  }),

  getSeo: catchAsync(async (_req: Request, res: Response) => {
    const data = await settingsService.getSeo();
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "SEO settings fetched successfully",
      data,
    });
  }),

  updateSeo: catchAsync(async (req: Request, res: Response) => {
    const data = await settingsService.updateSeo(req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "SEO settings updated successfully",
      data,
    });
  }),
};

