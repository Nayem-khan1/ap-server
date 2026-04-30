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

  deleteBlog: catchAsync(async (req: Request, res: Response) => {
    const data = await blogService.deleteBlog(req.params.id);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Blog post deleted successfully",
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

  listAuthors: catchAsync(async (_req: Request, res: Response) => {
    const data = await blogService.listAuthors();
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Blog authors fetched successfully",
      data,
    });
  }),

  createAuthor: catchAsync(async (req: Request, res: Response) => {
    const data = await blogService.createAuthor(req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Blog author created successfully",
      data,
    });
  }),

  updateAuthor: catchAsync(async (req: Request, res: Response) => {
    const data = await blogService.updateAuthor(req.params.id, req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Blog author updated successfully",
      data,
    });
  }),

  deleteAuthor: catchAsync(async (req: Request, res: Response) => {
    const data = await blogService.deleteAuthor(req.params.id);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Blog author deleted successfully",
      data,
    });
  }),

  bulkDeleteAuthors: catchAsync(async (req: Request, res: Response) => {
    const data = await blogService.bulkDeleteAuthors(req.body.ids);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Blog authors deleted successfully",
      data,
    });
  }),
};
