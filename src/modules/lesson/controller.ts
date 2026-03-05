import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../utils/catch-async";
import { sendResponse } from "../../utils/send-response";
import { lessonService } from "./service";

export const lessonController = {
  getLessonById: catchAsync(async (req: Request, res: Response) => {
    const data = await lessonService.getLessonById(req.params.id);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Lesson fetched successfully",
      data,
    });
  }),

  listLessons: catchAsync(async (_req: Request, res: Response) => {
    const data = await lessonService.listLessons();
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Lessons fetched successfully",
      data,
    });
  }),

  createLesson: catchAsync(async (req: Request, res: Response) => {
    const data = await lessonService.createLesson(req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Lesson created successfully",
      data,
    });
  }),

  updateLesson: catchAsync(async (req: Request, res: Response) => {
    const data = await lessonService.updateLesson(req.params.id, req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Lesson updated successfully",
      data,
    });
  }),

  setLessonPublishStatus: catchAsync(async (req: Request, res: Response) => {
    const data = await lessonService.setPublishStatus(
      req.params.id,
      req.body.publish_status,
    );
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Lesson status updated successfully",
      data,
    });
  }),

  bulkDeleteLessons: catchAsync(async (req: Request, res: Response) => {
    const data = await lessonService.bulkDelete(req.body.ids);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Lessons deleted successfully",
      data,
    });
  }),

  listLessonContents: catchAsync(async (req: Request, res: Response) => {
    const data = await lessonService.listByLesson(req.params.lessonId);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Lesson contents fetched successfully",
      data,
    });
  }),

  createLessonContent: catchAsync(async (req: Request, res: Response) => {
    const data = await lessonService.createLessonContent(req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Lesson content created successfully",
      data,
    });
  }),

  updateLessonContent: catchAsync(async (req: Request, res: Response) => {
    const data = await lessonService.updateLessonContent(req.params.contentId, req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Lesson content updated successfully",
      data,
    });
  }),

  deleteLessonContent: catchAsync(async (req: Request, res: Response) => {
    const data = await lessonService.deleteLessonContent(req.params.contentId);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Lesson content deleted successfully",
      data,
    });
  }),

  reorderLessonContents: catchAsync(async (req: Request, res: Response) => {
    const data = await lessonService.reorderLessonContents(
      req.body.lessonId,
      req.body.contentIds,
    );
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Lesson contents reordered successfully",
      data,
    });
  }),

  learningFlowByLesson: catchAsync(async (req: Request, res: Response) => {
    const data = await lessonService.learningFlowByLesson(req.params.lessonId);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Learning flow fetched successfully",
      data,
    });
  }),

  saveLearningFlow: catchAsync(async (req: Request, res: Response) => {
    const data = await lessonService.saveLearningFlow(req.params.lessonId, req.body.steps);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Learning flow saved successfully",
      data,
    });
  }),

  listQuizSteps: catchAsync(async (_req: Request, res: Response) => {
    const data = await lessonService.listQuizSteps();
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Quiz steps fetched successfully",
      data,
    });
  }),

  createQuizStep: catchAsync(async (req: Request, res: Response) => {
    const data = await lessonService.createQuizStep(req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Quiz step created successfully",
      data,
    });
  }),

  updateQuizStep: catchAsync(async (req: Request, res: Response) => {
    const data = await lessonService.updateQuizStep(req.params.id, req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Quiz step updated successfully",
      data,
    });
  }),

  setQuizPublishStatus: catchAsync(async (req: Request, res: Response) => {
    const data = await lessonService.setQuizPublishStatus(req.params.id, req.body.publish_status);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Quiz status updated successfully",
      data,
    });
  }),

  bulkDeleteQuizSteps: catchAsync(async (req: Request, res: Response) => {
    const data = await lessonService.bulkDeleteQuizSteps(req.body.ids);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Quiz steps deleted successfully",
      data,
    });
  }),

  listSmartNoteSteps: catchAsync(async (_req: Request, res: Response) => {
    const data = await lessonService.listSmartNoteSteps();
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Smart note steps fetched successfully",
      data,
    });
  }),

  createSmartNoteStep: catchAsync(async (req: Request, res: Response) => {
    const data = await lessonService.createSmartNoteStep(req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Smart note step created successfully",
      data,
    });
  }),

  updateSmartNoteStep: catchAsync(async (req: Request, res: Response) => {
    const data = await lessonService.updateSmartNoteStep(req.params.id, req.body);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Smart note step updated successfully",
      data,
    });
  }),

  setSmartNotePublishStatus: catchAsync(async (req: Request, res: Response) => {
    const data = await lessonService.setSmartNotePublishStatus(
      req.params.id,
      req.body.publish_status,
    );
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Smart note status updated successfully",
      data,
    });
  }),

  bulkDeleteSmartNoteSteps: catchAsync(async (req: Request, res: Response) => {
    const data = await lessonService.bulkDeleteSmartNoteSteps(req.body.ids);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Smart note steps deleted successfully",
      data,
    });
  }),
};
