import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../utils/catch-async";
import { sendResponse } from "../../utils/send-response";
import { userService } from "./service";

export const userController = {
  listUsers: catchAsync(async (req: Request, res: Response) => {
    const data = await userService.listUsers(req.query as Record<string, unknown>);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Users fetched successfully",
      data,
    });
  }),

  listStudents: catchAsync(async (req: Request, res: Response) => {
    const data = await userService.listStudents(req.query as Record<string, unknown>);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Students fetched successfully",
      data,
    });
  }),

  getStudentById: catchAsync(async (req: Request, res: Response) => {
    const data = await userService.getStudentById(req.params.id);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Student profile fetched successfully",
      data,
    });
  }),

  getStudentEnrollments: catchAsync(async (req: Request, res: Response) => {
    const data = await userService.getStudentEnrollments(req.params.id);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Student enrollments fetched successfully",
      data,
    });
  }),

  getStudentPayments: catchAsync(async (req: Request, res: Response) => {
    const data = await userService.getStudentPayments(req.params.id);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Student payments fetched successfully",
      data,
    });
  }),

  getStudentProgress: catchAsync(async (req: Request, res: Response) => {
    const data = await userService.getStudentProgress(req.params.id);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Student progress fetched successfully",
      data,
    });
  }),

  listAdmins: catchAsync(async (req: Request, res: Response) => {
    const data = await userService.listAdmins(req.query as Record<string, unknown>);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Admins fetched successfully",
      data,
    });
  }),

  createAdmin: catchAsync(async (req: Request, res: Response) => {
    const data = await userService.createAdmin(req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Admin created successfully",
      data,
    });
  }),

  updateAdmin: catchAsync(async (req: Request, res: Response) => {
    const data = await userService.updateAdmin(req.params.id, req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Admin updated successfully",
      data,
    });
  }),

  bulkDeleteAdmins: catchAsync(async (req: Request, res: Response) => {
    const data = await userService.bulkDeleteAdmins(req.body.ids);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Admins deleted successfully",
      data,
    });
  }),

  listInstructors: catchAsync(async (_req: Request, res: Response) => {
    const data = await userService.listInstructors();
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Instructors fetched successfully",
      data,
    });
  }),

  createInstructor: catchAsync(async (req: Request, res: Response) => {
    const data = await userService.createInstructor(req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Instructor created successfully",
      data,
    });
  }),

  updateInstructor: catchAsync(async (req: Request, res: Response) => {
    const data = await userService.updateInstructor(req.params.id, req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Instructor updated successfully",
      data,
    });
  }),

  deleteInstructor: catchAsync(async (req: Request, res: Response) => {
    const data = await userService.deleteInstructor(req.params.id);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Instructor deleted successfully",
      data,
    });
  }),
};
