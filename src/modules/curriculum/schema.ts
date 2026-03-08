import { z } from "zod";

const publishStatusSchema = z.enum(["draft", "published"]);

export const curriculumValidation = {
  listModules: {
    query: z.object({
      courseId: z.string().min(1),
    }),
  },
  createModule: {
    body: z.object({
      courseId: z.string().min(1),
      title_en: z.string().min(1),
      title_bn: z.string().min(1),
    }),
  },
  updateModule: {
    body: z.object({
      title_en: z.string().min(1).optional(),
      title_bn: z.string().min(1).optional(),
      publish_status: publishStatusSchema.optional(),
    }),
  },
  reorderModules: {
    body: z.object({
      moduleIds: z.array(z.string()).min(1),
    }),
  },

  listLessons: {
    query: z.object({
      moduleId: z.string().optional(),
      courseId: z.string().optional(),
    }),
  },
  createLesson: {
    body: z.object({
      title_en: z.string().min(1),
      title_bn: z.string().min(1),
    }),
  },
  updateLesson: {
    body: z.object({
      title_en: z.string().min(1).optional(),
      title_bn: z.string().min(1).optional(),
      publish_status: publishStatusSchema.optional(),
    }),
  },
  reorderLessons: {
    body: z.object({
      moduleId: z.string().min(1),
      lessonIds: z.array(z.string()).min(1),
    }),
  },

  listContents: {
    query: z.object({
      lessonId: z.string().min(1),
    }),
  },
  createContent: {
    body: z.object({
      type: z.enum(["video", "pdf", "quiz", "assignment", "resource"]),
      is_preview: z.boolean().default(false),
      video_data: z.any().optional(),
      pdf_data: z.any().optional(),
      quiz_data: z.any().optional(),
    }),
  },
  updateContent: {
    body: z.object({
      is_preview: z.boolean().optional(),
      video_data: z.any().optional(),
      pdf_data: z.any().optional(),
      quiz_data: z.any().optional(),
    }),
  },
  reorderContents: {
    body: z.object({
      lessonId: z.string().min(1),
      contentIds: z.array(z.string()).min(1),
    }),
  },
};
