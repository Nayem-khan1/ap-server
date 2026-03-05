import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../utils/catch-async";
import { sendResponse } from "../../utils/send-response";
import { courseService } from "./service";

export const courseController = {
  listCourses: catchAsync(async (req: Request, res: Response) => {
    const data = await courseService.listCourses(req.query as Record<string, unknown>);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Courses fetched successfully",
      data,
    });
  }),

  getCourseById: catchAsync(async (req: Request, res: Response) => {
    const data = await courseService.getCourseById(req.params.id);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Course fetched successfully",
      data,
    });
  }),

  createCourse: catchAsync(async (req: Request, res: Response) => {
    const data = await courseService.createCourse(req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Course created successfully",
      data,
    });
  }),

  updateCourse: catchAsync(async (req: Request, res: Response) => {
    const data = await courseService.updateCourse(req.params.id, req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Course updated successfully",
      data,
    });
  }),

  setCoursePublishStatus: catchAsync(async (req: Request, res: Response) => {
    const data = await courseService.setCoursePublishStatus(
      req.params.id,
      req.body.publish_status,
    );
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Course status updated successfully",
      data,
    });
  }),

  bulkDeleteCourses: catchAsync(async (req: Request, res: Response) => {
    const data = await courseService.bulkDeleteCourses(req.body.ids);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Courses deleted successfully",
      data,
    });
  }),

  listCategories: catchAsync(async (_req: Request, res: Response) => {
    const data = await courseService.listCategories();
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Course categories fetched successfully",
      data,
    });
  }),

  createCategory: catchAsync(async (req: Request, res: Response) => {
    const data = await courseService.createCategory(req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Course category created successfully",
      data,
    });
  }),

  updateCategory: catchAsync(async (req: Request, res: Response) => {
    const data = await courseService.updateCategory(req.params.id, req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Course category updated successfully",
      data,
    });
  }),

  setCategoryPublishStatus: catchAsync(async (req: Request, res: Response) => {
    const data = await courseService.setCategoryPublishStatus(
      req.params.id,
      req.body.publish_status,
    );
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Category status updated successfully",
      data,
    });
  }),

  bulkDeleteCategories: catchAsync(async (req: Request, res: Response) => {
    const data = await courseService.bulkDeleteCategories(req.body.ids);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Course categories deleted successfully",
      data,
    });
  }),

  listModulesByCourse: catchAsync(async (req: Request, res: Response) => {
    const data = await courseService.listModulesByCourse(req.params.courseId);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Course modules fetched successfully",
      data,
    });
  }),

  createModule: catchAsync(async (req: Request, res: Response) => {
    const data = await courseService.createModule(req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Course module created successfully",
      data,
    });
  }),

  updateModule: catchAsync(async (req: Request, res: Response) => {
    const data = await courseService.updateModule(req.params.moduleId, req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Course module updated successfully",
      data,
    });
  }),

  deleteModule: catchAsync(async (req: Request, res: Response) => {
    const data = await courseService.deleteModule(req.params.moduleId);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Course module deleted successfully",
      data,
    });
  }),
};
