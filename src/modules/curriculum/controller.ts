import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { CourseModuleModel } from "../course/model";
import { LessonModel, LessonContentModel } from "../lesson/model";
import { normalizeLessonContentDocument } from "../lesson/content-normalizer";
import { sendResponse } from "../../utils/send-response";
import { catchAsync } from "../../utils/catch-async";

export const curriculumController = {
  listModules: catchAsync(async (req: Request, res: Response) => {
    const { courseId } = req.query;

    const modules = await CourseModuleModel.find({ course_id: courseId }).sort({
      order_no: 1,
    });

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Modules fetched successfully",
      data: modules,
    });
  }),
  createModule: catchAsync(async (req: Request, res: Response) => {
    const { courseId, title_en, title_bn } = req.body;

    const moduleCount = await CourseModuleModel.countDocuments({
      course_id: courseId,
    });

    const newModule = await CourseModuleModel.create({
      course_id: courseId,
      title_en,
      title_bn,
      order_no: moduleCount + 1,
      publish_status: "published",
    });

    sendResponse({
      res,
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Module created successfully",
      data: newModule,
    });
  }),

  updateModule: catchAsync(async (req: Request, res: Response) => {
    const { moduleId } = req.params;

    const updated = await CourseModuleModel.findByIdAndUpdate(
      moduleId,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Module updated successfully",
      data: updated,
    });
  }),

  reorderModules: catchAsync(async (req: Request, res: Response) => {
    const { moduleIds } = req.body;

    await Promise.all(
      moduleIds.map((id: string, index: number) =>
        CourseModuleModel.findByIdAndUpdate(id, { order_no: index + 1 }),
      ),
    );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Modules reordered successfully",
      data: null,
    });
  }),

  deleteModule: catchAsync(async (req: Request, res: Response) => {
    const { moduleId } = req.params;
    await CourseModuleModel.findByIdAndDelete(moduleId);

    // Should also delete associated lessons and contents but keeping it simple
    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Module deleted successfully",
      data: null,
    });
  }),

  listLessonsByModule: catchAsync(async (req: Request, res: Response) => {
    const { moduleId } = req.params;
    const lessons = await LessonModel.find({ module_id: moduleId }).sort({
      order_no: 1,
    });

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Lessons fetched successfully",
      data: lessons,
    });
  }),

  listLessons: catchAsync(async (req: Request, res: Response) => {
    const { courseId, moduleId } = req.query;
    const filter: any = {};
    if (courseId) filter.course_id = courseId;
    if (moduleId) filter.module_id = moduleId;

    const lessons = await LessonModel.find(filter).sort({ order_no: 1 });

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Lessons fetched successfully",
      data: lessons,
    });
  }),

  createLesson: catchAsync(async (req: Request, res: Response) => {
    const { moduleId } = req.params;
    const { title_en, title_bn } = req.body;

    const module = await CourseModuleModel.findById(moduleId);
    if (!module) throw new Error("Module not found");

    const lessonCount = await LessonModel.countDocuments({
      module_id: moduleId,
    });

    const newLesson = await LessonModel.create({
      course_id: module.course_id,
      module_id: moduleId,
      module_title_en: module.title_en,
      module_title_bn: module.title_bn,
      title_en,
      title_bn,
      order_no: lessonCount + 1,
      publish_status: "published",
    });

    sendResponse({
      res,
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Lesson created successfully",
      data: newLesson,
    });
  }),

  updateLesson: catchAsync(async (req: Request, res: Response) => {
    const { lessonId } = req.params;

    const updated = await LessonModel.findByIdAndUpdate(lessonId, req.body, {
      new: true,
      runValidators: true,
    });

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Lesson updated successfully",
      data: updated,
    });
  }),

  reorderLessons: catchAsync(async (req: Request, res: Response) => {
    const { moduleId, lessonIds } = req.body;

    await Promise.all(
      lessonIds.map((id: string, index: number) =>
        LessonModel.findOneAndUpdate(
          { _id: id, module_id: moduleId },
          { order_no: index + 1 },
        ),
      ),
    );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Lessons reordered successfully",
      data: null,
    });
  }),

  deleteLesson: catchAsync(async (req: Request, res: Response) => {
    const { lessonId } = req.params;
    await LessonModel.findByIdAndDelete(lessonId);

    // Should also delete associated contents
    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Lesson deleted successfully",
      data: null,
    });
  }),

  listContentsByLesson: catchAsync(async (req: Request, res: Response) => {
    const { lessonId } = req.params;
    const contents = await LessonContentModel.find({
      lesson_id: lessonId,
    }).sort({ order_no: 1 });

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Contents fetched successfully",
      data: contents.map((content) =>
        normalizeLessonContentDocument(content.toJSON() as Record<string, unknown>),
      ),
    });
  }),

  createContent: catchAsync(async (req: Request, res: Response) => {
    const { lessonId } = req.params;

    const lesson = await LessonModel.findById(lessonId);
    if (!lesson) throw new Error("Lesson not found");

    const contentCount = await LessonContentModel.countDocuments({
      lesson_id: lessonId,
    });

    const newContent = await LessonContentModel.create({
      ...req.body,
      course_id: lesson.course_id,
      lesson_id: lessonId,
      order_no: contentCount + 1,
      unlock_condition: "auto_unlock",
    });

    sendResponse({
      res,
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Content created successfully",
      data: normalizeLessonContentDocument(
        newContent.toJSON() as Record<string, unknown>,
      ),
    });
  }),

  updateContent: catchAsync(async (req: Request, res: Response) => {
    const { contentId } = req.params;

    const updated = await LessonContentModel.findByIdAndUpdate(
      contentId,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Content updated successfully",
      data: updated
        ? normalizeLessonContentDocument(
            updated.toJSON() as Record<string, unknown>,
          )
        : updated,
    });
  }),

  reorderContents: catchAsync(async (req: Request, res: Response) => {
    const { lessonId, contentIds } = req.body;

    await Promise.all(
      contentIds.map((id: string, index: number) =>
        LessonContentModel.findOneAndUpdate(
          { _id: id, lesson_id: lessonId },
          { order_no: index + 1 },
        ),
      ),
    );

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Content reordered successfully",
      data: null,
    });
  }),

  deleteContent: catchAsync(async (req: Request, res: Response) => {
    const { contentId } = req.params;
    await LessonContentModel.findByIdAndDelete(contentId);

    sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Content deleted successfully",
      data: null,
    });
  }),
};
