import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../utils/catch-async";
import { sendResponse } from "../../utils/send-response";
import { blogService } from "./service";

export const blogController = {
  listBlogs: catchAsync(async (_req: Request, res: Response) => {
    const data = await blogService.listBlogs();
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Blog posts fetched successfully",
      data,
    });
  }),

  getBlogById: catchAsync(async (req: Request, res: Response) => {
    const data = await blogService.getBlogById(req.params.id);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Blog post fetched successfully",
      data,
    });
  }),

  createBlog: catchAsync(async (req: Request, res: Response) => {
    const data = await blogService.createBlog(req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Blog post created successfully",
      data,
    });
  }),

  updateBlog: catchAsync(async (req: Request, res: Response) => {
    const data = await blogService.updateBlog(req.params.id, req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Blog post updated successfully",
      data,
    });
  }),

  setPublishStatus: catchAsync(async (req: Request, res: Response) => {
    const data = await blogService.setPublishStatus(req.params.id, req.body.publish_status);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Blog status updated successfully",
      data,
    });
  }),

  bulkDelete: catchAsync(async (req: Request, res: Response) => {
    const data = await blogService.bulkDelete(req.body.ids);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Blog posts deleted successfully",
      data,
    });
  }),

  listCategories: catchAsync(async (_req: Request, res: Response) => {
    const data = await blogService.listCategories();
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Blog categories fetched successfully",
      data,
    });
  }),

  createCategory: catchAsync(async (req: Request, res: Response) => {
    const data = await blogService.createCategory(req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Blog category created successfully",
      data,
    });
  }),

  updateCategory: catchAsync(async (req: Request, res: Response) => {
    const data = await blogService.updateCategory(req.params.id, req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Blog category updated successfully",
      data,
    });
  }),

  bulkDeleteCategories: catchAsync(async (req: Request, res: Response) => {
    const data = await blogService.bulkDeleteCategories(req.body.ids);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Blog categories deleted successfully",
      data,
    });
  }),
};
