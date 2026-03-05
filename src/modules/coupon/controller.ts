import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../utils/catch-async";
import { sendResponse } from "../../utils/send-response";
import { couponService } from "./service";

export const couponController = {
  listCoupons: catchAsync(async (_req: Request, res: Response) => {
    const data = await couponService.listCoupons();
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Coupons fetched successfully",
      data,
    });
  }),

  createCoupon: catchAsync(async (req: Request, res: Response) => {
    const data = await couponService.createCoupon(req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Coupon created successfully",
      data,
    });
  }),

  updateCoupon: catchAsync(async (req: Request, res: Response) => {
    const data = await couponService.updateCoupon(req.params.id, req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Coupon updated successfully",
      data,
    });
  }),

  setCouponActive: catchAsync(async (req: Request, res: Response) => {
    const data = await couponService.setCouponActive(req.params.id, req.body.is_active);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Coupon status updated successfully",
      data,
    });
  }),

  bulkDeleteCoupons: catchAsync(async (req: Request, res: Response) => {
    const data = await couponService.bulkDeleteCoupons(req.body.ids);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Coupons deleted successfully",
      data,
    });
  }),
};

