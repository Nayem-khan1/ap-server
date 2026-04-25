import { StatusCodes } from "http-status-codes";
import { AppError } from "../../errors/app-error";
import { CourseModel, CourseModuleModel } from "../course/model";
import { LessonContentModel, LessonModel } from "./model";

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function toLearningStep(content: Record<string, unknown>) {
  const type = content.type as string;
  const stepType = type === "video" ? "VIDEO" : type === "quiz" ? "QUIZ" : "SMART_NOTE";
  return {
    id: content.id,
    lesson_id: content.lesson_id,
    order_no: content.order_no,
    step_type: stepType,
    unlock_condition: content.unlock_condition,
    video:
      type === "video"
        ? {
            youtube_unlisted_url: content.video_url ?? "",
            duration: content.video_duration ?? "",
          }
        : undefined,
    quiz:
      type === "quiz"
        ? {
            title: content.quiz_title ?? "",
            pass_mark: content.quiz_pass_mark ?? 0,
            time_limit: content.quiz_time_limit ?? 0,
            max_attempt: content.quiz_max_attempt ?? 1,
            publish_status: content.quiz_publish_status ?? "draft",
            questions: content.quiz_questions ?? [],
          }
        : undefined,
    smart_note:
      type === "note"
        ? {
            note_title_en: content.note_title_en ?? "",
            note_title_bn: content.note_title_bn ?? "",
            pdf_upload: content.note_pdf_url ?? "",
            note_template: content.note_template ?? "",
            downloadable: content.note_downloadable ?? false,
            allow_student_personal_note: content.note_allow_student_personal_note ?? false,
            publish_status: content.note_publish_status ?? "draft",
          }
        : undefined,
  };
}

async function attachCourseContext(lessonId: string) {
  const lesson = await LessonModel.findById(lessonId);
  if (!lesson) return { lesson_title: "Unknown", course_id: "", course_title: "Unknown" };
  const course = await CourseModel.findById(lesson.course_id);
  return {
    lesson_title: lesson.title_en,
    course_id: lesson.course_id,
    course_title: course?.title_en ?? "Unknown",
  };
}

export const lessonService = {
  async getLessonById(id: string) {
    const lesson = await LessonModel.findById(id);
    if (!lesson) throw new AppError(StatusCodes.NOT_FOUND, "Lesson not found");
    return lesson.toJSON();
  },

  async listLessons() {
    const lessons = await LessonModel.find().sort({ updatedAt: -1 });
    return lessons.map((lesson) => lesson.toJSON());
  },

  async createLesson(payload: Record<string, unknown>) {
    const courseId = String(payload.course_id);
    const moduleTitleEn = String(payload.module_title_en);
    const moduleTitleBn = String(payload.module_title_bn);

    let module = await CourseModuleModel.findOne({
      course_id: courseId,
      title_en: moduleTitleEn,
      title_bn: moduleTitleBn,
    });

    if (!module) {
      const count = await CourseModuleModel.countDocuments({ course_id: courseId });
      module = await CourseModuleModel.create({
        course_id: courseId,
        title_en: moduleTitleEn,
        title_bn: moduleTitleBn,
        order_no: count + 1,
        publish_status: "published",
      });
    }

    const lesson = await LessonModel.create({
      course_id: courseId,
      module_id: module.id,
      module_title_en: moduleTitleEn,
      module_title_bn: moduleTitleBn,
      title_en: payload.title_en,
      title_bn: payload.title_bn,
      lesson_type: "video",
      youtube_unlisted_url: payload.youtube_unlisted_url,
      duration: payload.duration,
      order_no: payload.order_no,
      quiz_id: payload.quiz_id ?? null,
      smart_note_id: payload.smart_note_id ?? null,
      publish_status: payload.publish_status,
    });

    await LessonContentModel.create({
      lesson_id: lesson.id,
      type: "video",
      order_no: 1,
      video_url: payload.youtube_unlisted_url ?? "",
      video_duration: payload.duration ?? "",
      unlock_condition: "auto_unlock",
    });

    await CourseModel.findByIdAndUpdate(courseId, { $inc: { total_lessons: 1 } });

    return lesson.toJSON();
  },

  async updateLesson(id: string, payload: Record<string, unknown>) {
    const lesson = await LessonModel.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });

    if (!lesson) throw new AppError(StatusCodes.NOT_FOUND, "Lesson not found");

    if (typeof payload.youtube_unlisted_url === "string" || typeof payload.duration === "string") {
      const firstVideo = await LessonContentModel.findOne({
        lesson_id: id,
        type: "video",
      }).sort({ order_no: 1 });
      if (firstVideo) {
        if (typeof payload.youtube_unlisted_url === "string") {
          (firstVideo as typeof firstVideo & { video_url?: string }).video_url = payload.youtube_unlisted_url;
        }
        if (typeof payload.duration === "string") {
          (firstVideo as typeof firstVideo & { video_duration?: string }).video_duration = payload.duration;
        }
        await firstVideo.save();
      }
    }

    return lesson.toJSON();
  },

  async setPublishStatus(id: string, publish_status: "draft" | "published") {
    const lesson = await LessonModel.findByIdAndUpdate(
      id,
      { publish_status },
      { new: true },
    );
    if (!lesson) throw new AppError(StatusCodes.NOT_FOUND, "Lesson not found");
    return lesson.toJSON();
  },

  async bulkDelete(ids: string[]) {
    const lessons = await LessonModel.find({ _id: { $in: ids } });
    const courseIds = Array.from(new Set(lessons.map((item) => item.course_id)));
    await LessonModel.deleteMany({ _id: { $in: ids } });
    await LessonContentModel.deleteMany({ lesson_id: { $in: ids } });
    for (const courseId of courseIds) {
      const count = await LessonModel.countDocuments({ course_id: courseId });
      await CourseModel.findByIdAndUpdate(courseId, { total_lessons: count });
    }
    return true;
  },

  async listByLesson(lessonId: string) {
    const items = await LessonContentModel.find({ lesson_id: lessonId }).sort({ order_no: 1 });
    return items.map((item) => item.toJSON());
  },

  async createLessonContent(payload: Record<string, unknown>) {
    const lessonId = String(payload.lesson_id);
    const count = await LessonContentModel.countDocuments({ lesson_id: lessonId });
    const item = await LessonContentModel.create({
      lesson_id: lessonId,
      type: payload.type,
      order_no: count + 1,
      video_url: payload.video_url ?? "",
      video_duration: payload.video_duration ?? "",
      quiz_title: payload.quiz_title ?? "",
      quiz_pass_mark: payload.quiz_pass_mark ?? 70,
      quiz_time_limit: payload.quiz_time_limit ?? 0,
      quiz_questions: payload.quiz_questions ?? [],
      note_title_en: payload.note_title_en ?? "",
      note_title_bn: payload.note_title_bn ?? "",
      note_content: payload.note_content ?? "",
      note_pdf_url: payload.note_pdf_url ?? "",
      unlock_condition: payload.unlock_condition ?? "after_previous_completed",
    });
    return item.toJSON();
  },

  async updateLessonContent(id: string, payload: Record<string, unknown>) {
    const item = await LessonContentModel.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });
    if (!item) throw new AppError(StatusCodes.NOT_FOUND, "Lesson content not found");
    return item.toJSON();
  },

  async deleteLessonContent(id: string) {
    await LessonContentModel.findByIdAndDelete(id);
    return true;
  },

  async reorderLessonContents(lessonId: string, contentIds: string[]) {
    const updates = contentIds.map((contentId, index) =>
      LessonContentModel.findOneAndUpdate(
        { _id: contentId, lesson_id: lessonId },
        { order_no: index + 1 },
        { new: true },
      ),
    );
    await Promise.all(updates);
    return true;
  },

  async learningFlowByLesson(lessonId: string) {
    const items = await LessonContentModel.find({ lesson_id: lessonId }).sort({ order_no: 1 });
    return items.map((item) => toLearningStep(item.toJSON()));
  },

  async saveLearningFlow(lessonId: string, steps: Array<Record<string, unknown>>) {
    await LessonContentModel.deleteMany({ lesson_id: lessonId });

    const mapped = steps.map((step, index) => {
      const stepType = String(step.step_type ?? "");
      if (stepType === "VIDEO") {
        const video = (step.video as Record<string, unknown>) ?? {};
        return {
          lesson_id: lessonId,
          type: "video",
          order_no: index + 1,
          video_url: video.youtube_unlisted_url ?? "",
          video_duration: video.duration ?? "",
          unlock_condition: step.unlock_condition ?? "auto_unlock",
        };
      }
      if (stepType === "QUIZ") {
        const quiz = (step.quiz as Record<string, unknown>) ?? {};
        return {
          lesson_id: lessonId,
          type: "quiz",
          order_no: index + 1,
          quiz_title: quiz.title ?? "",
          quiz_pass_mark: quiz.pass_mark ?? 70,
          quiz_time_limit: quiz.time_limit ?? 0,
          quiz_max_attempt: quiz.max_attempt ?? 1,
          quiz_publish_status: quiz.publish_status ?? "draft",
          quiz_questions: quiz.questions ?? [],
          unlock_condition: step.unlock_condition ?? "after_previous_completed",
        };
      }
      const smartNote = (step.smart_note as Record<string, unknown>) ?? {};
      return {
        lesson_id: lessonId,
        type: "note",
        order_no: index + 1,
        note_title_en: smartNote.note_title_en ?? "",
        note_title_bn: smartNote.note_title_bn ?? "",
        note_pdf_url: smartNote.pdf_upload ?? "",
        note_template: smartNote.note_template ?? "",
        note_downloadable: smartNote.downloadable ?? false,
        note_allow_student_personal_note:
          smartNote.allow_student_personal_note ?? false,
        note_publish_status: smartNote.publish_status ?? "draft",
        unlock_condition: step.unlock_condition ?? "after_previous_completed",
      };
    });

    if (mapped.length) {
      await LessonContentModel.insertMany(mapped);
    }
    return true;
  },

  async listQuizSteps() {
    const quizContents = await LessonContentModel.find({ type: "quiz" }).sort({
      updatedAt: -1,
    });
    const result = [];
    for (const content of quizContents) {
      const context = await attachCourseContext(content.lesson_id);
      const step = toLearningStep(content.toJSON());
      result.push({ ...step, ...context });
    }
    return result;
  },

  async createQuizStep(payload: Record<string, unknown>) {
    const quiz = (payload.quiz as Record<string, unknown>) ?? {};
    const item = await LessonContentModel.create({
      lesson_id: payload.lesson_id,
      type: "quiz",
      order_no:
        (await LessonContentModel.countDocuments({ lesson_id: payload.lesson_id })) + 1,
      quiz_title: quiz.title ?? "",
      quiz_pass_mark: quiz.pass_mark ?? 70,
      quiz_time_limit: quiz.time_limit ?? 0,
      quiz_max_attempt: quiz.max_attempt ?? 1,
      quiz_publish_status: quiz.publish_status ?? "draft",
      quiz_questions: quiz.questions ?? [],
      unlock_condition: payload.unlock_condition ?? "after_previous_completed",
    });
    return toLearningStep(item.toJSON());
  },

  async updateQuizStep(id: string, payload: Record<string, unknown>) {
    const quiz = (payload.quiz as Record<string, unknown>) ?? {};
    const item = await LessonContentModel.findOneAndUpdate(
      { _id: id, type: "quiz" },
      {
        lesson_id: payload.lesson_id,
        quiz_title: quiz.title,
        quiz_pass_mark: quiz.pass_mark,
        quiz_time_limit: quiz.time_limit,
        quiz_max_attempt: quiz.max_attempt,
        quiz_publish_status: quiz.publish_status,
        quiz_questions: quiz.questions,
        unlock_condition: payload.unlock_condition,
      },
      { new: true, runValidators: true },
    );
    if (!item) throw new AppError(StatusCodes.NOT_FOUND, "Quiz step not found");
    return toLearningStep(item.toJSON());
  },

  async setQuizPublishStatus(id: string, publishStatus: "draft" | "published") {
    const item = await LessonContentModel.findOneAndUpdate(
      { _id: id, type: "quiz" },
      { quiz_publish_status: publishStatus },
      { new: true },
    );
    if (!item) throw new AppError(StatusCodes.NOT_FOUND, "Quiz step not found");
    return toLearningStep(item.toJSON());
  },

  async bulkDeleteQuizSteps(ids: string[]) {
    await LessonContentModel.deleteMany({ _id: { $in: ids }, type: "quiz" });
    return true;
  },

  async listSmartNoteSteps() {
    const noteContents = await LessonContentModel.find({ type: "note" }).sort({
      updatedAt: -1,
    });
    const result = [];
    for (const content of noteContents) {
      const context = await attachCourseContext(content.lesson_id);
      const step = toLearningStep(content.toJSON());
      result.push({ ...step, ...context });
    }
    return result;
  },

  async createSmartNoteStep(payload: Record<string, unknown>) {
    const smartNote = (payload.smart_note as Record<string, unknown>) ?? {};
    const item = await LessonContentModel.create({
      lesson_id: payload.lesson_id,
      type: "note",
      order_no:
        (await LessonContentModel.countDocuments({ lesson_id: payload.lesson_id })) + 1,
      note_title_en: smartNote.note_title_en ?? "",
      note_title_bn: smartNote.note_title_bn ?? "",
      note_pdf_url: smartNote.pdf_upload ?? "",
      note_template: smartNote.note_template ?? "",
      note_downloadable: smartNote.downloadable ?? false,
      note_allow_student_personal_note:
        smartNote.allow_student_personal_note ?? false,
      note_publish_status: smartNote.publish_status ?? "draft",
      unlock_condition: payload.unlock_condition ?? "after_previous_completed",
    });
    return toLearningStep(item.toJSON());
  },

  async updateSmartNoteStep(id: string, payload: Record<string, unknown>) {
    const smartNote = (payload.smart_note as Record<string, unknown>) ?? {};
    const item = await LessonContentModel.findOneAndUpdate(
      { _id: id, type: "note" },
      {
        lesson_id: payload.lesson_id,
        note_title_en: smartNote.note_title_en,
        note_title_bn: smartNote.note_title_bn,
        note_pdf_url: smartNote.pdf_upload,
        note_template: smartNote.note_template,
        note_downloadable: smartNote.downloadable,
        note_allow_student_personal_note: smartNote.allow_student_personal_note,
        note_publish_status: smartNote.publish_status,
        unlock_condition: payload.unlock_condition,
      },
      { new: true, runValidators: true },
    );
    if (!item) throw new AppError(StatusCodes.NOT_FOUND, "Smart note step not found");
    return toLearningStep(item.toJSON());
  },

  async setSmartNotePublishStatus(id: string, publishStatus: "draft" | "published") {
    const item = await LessonContentModel.findOneAndUpdate(
      { _id: id, type: "note" },
      { note_publish_status: publishStatus },
      { new: true },
    );
    if (!item) throw new AppError(StatusCodes.NOT_FOUND, "Smart note step not found");
    return toLearningStep(item.toJSON());
  },

  async bulkDeleteSmartNoteSteps(ids: string[]) {
    await LessonContentModel.deleteMany({ _id: { $in: ids }, type: "note" });
    return true;
  },
};

