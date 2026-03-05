import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../utils/catch-async";
import { sendResponse } from "../../utils/send-response";
import { eventService } from "./service";

export const eventController = {
  listEvents: catchAsync(async (_req: Request, res: Response) => {
    const data = await eventService.listEvents();
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Events fetched successfully",
      data,
    });
  }),

  listEventRegistrations: catchAsync(async (_req: Request, res: Response) => {
    const data = await eventService.listEventRegistrations();
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Event registrations fetched successfully",
      data,
    });
  }),

  createEvent: catchAsync(async (req: Request, res: Response) => {
    const data = await eventService.createEvent(req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Event created successfully",
      data,
    });
  }),

  updateEvent: catchAsync(async (req: Request, res: Response) => {
    const data = await eventService.updateEvent(req.params.id, req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Event updated successfully",
      data,
    });
  }),

  setPublishStatus: catchAsync(async (req: Request, res: Response) => {
    const data = await eventService.setPublishStatus(req.params.id, req.body.publish_status);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Event status updated successfully",
      data,
    });
  }),

  bulkDelete: catchAsync(async (req: Request, res: Response) => {
    const data = await eventService.bulkDelete(req.body.ids);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Events deleted successfully",
      data,
    });
  }),

  updateRegistrationPaymentStatus: catchAsync(async (req: Request, res: Response) => {
    const data = await eventService.setRegistrationPaymentStatus(
      req.params.id,
      req.body.payment_status,
    );
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Registration payment status updated successfully",
      data,
    });
  }),
};

