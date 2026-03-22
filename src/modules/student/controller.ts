import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../errors/app-error";
import { catchAsync } from "../../utils/catch-async";
import { sendResponse } from "../../utils/send-response";
import { studentService } from "./service";

function resolveStudentId(req: Request): string {
  const studentId = req.user?.userId;
  if (!studentId) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Unauthorized");
  }
  return studentId;
}

function resolveLocale(req: Request): "en" | "bn" {
  return req.query.lang === "bn" ? "bn" : "en";
}

export const studentController = {
  getProfile: catchAsync(async (req: Request, res: Response) => {
    const studentId = resolveStudentId(req);
    const data = await studentService.getProfile(studentId);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Student profile fetched successfully",
      data,
    });
  }),

  updateProfile: catchAsync(async (req: Request, res: Response) => {
    const studentId = resolveStudentId(req);
    const data = await studentService.updateProfile(studentId, req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Student profile updated successfully",
      data,
    });
  }),

  getDashboard: catchAsync(async (req: Request, res: Response) => {
    const studentId = resolveStudentId(req);
    const data = await studentService.getDashboard(studentId, resolveLocale(req));
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Student dashboard fetched successfully",
      data,
    });
  }),

  getCourses: catchAsync(async (req: Request, res: Response) => {
    const studentId = resolveStudentId(req);
    const data = await studentService.getCourses(studentId, resolveLocale(req));
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Student courses fetched successfully",
      data,
    });
  }),

  enrollInCourse: catchAsync(async (req: Request, res: Response) => {
    const studentId = resolveStudentId(req);
    const data = await studentService.enrollInCourse(studentId, req.params.courseId);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Course enrollment processed successfully",
      data,
    });
  }),

  completeNextLesson: catchAsync(async (req: Request, res: Response) => {
    const studentId = resolveStudentId(req);
    const data = await studentService.completeNextLesson(studentId, req.params.courseId);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Lesson completion updated successfully",
      data,
    });
  }),
};
