import { z } from "zod";

const youtubeUrlRegex =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[A-Za-z0-9_-]{6,}.*$/;

export const lessonPublishStatusSchema = z.enum(["draft", "published"]);
export const questionTypeSchema = z.enum(["MCQ", "MULTIPLE_SELECT", "TRUE_FALSE"]);
export const unlockConditionSchema = z.enum([
  "auto_unlock",
  "after_previous_completed",
  "after_quiz_pass",
]);

export const lessonFormSchema = z.object({
  course_id: z.string().min(1),
  module_title_en: z.string().min(2),
  module_title_bn: z.string().min(2),
  title_en: z.string().min(2),
  title_bn: z.string().min(2),
  lesson_type: z.literal("video"),
  youtube_unlisted_url: z.string().min(1).regex(youtubeUrlRegex),
  duration: z.string().min(1),
  order_no: z.coerce.number().int().min(1),
  quiz_id: z.string().nullable().default(null),
  smart_note_id: z.string().nullable().default(null),
  publish_status: lessonPublishStatusSchema,
});

export const lessonContentCreateSchema = z.object({
  lesson_id: z.string().min(1),
  type: z.enum(["video", "quiz", "note"]),
  video_url: z.string().optional(),
  video_duration: z.string().optional(),
  quiz_title: z.string().optional(),
  quiz_pass_mark: z.coerce.number().int().min(0).max(100).optional(),
  quiz_time_limit: z.coerce.number().int().min(0).optional(),
  quiz_questions: z.array(z.any()).optional(),
  note_title_en: z.string().optional(),
  note_title_bn: z.string().optional(),
  note_content: z.string().optional(),
  note_pdf_url: z.string().optional(),
  unlock_condition: unlockConditionSchema.optional(),
});

export const lessonContentUpdateSchema = lessonContentCreateSchema.partial();

export const quizQuestionSchema = z.object({
  id: z.string(),
  question_en: z.string().min(2),
  question_bn: z.string().min(2),
  question_type: questionTypeSchema,
  options: z.array(z.string().min(1)).min(2),
  correct_answer: z.union([z.string(), z.array(z.string())]),
  explanation_en: z.string().default(""),
  explanation_bn: z.string().default(""),
});

export const quizFormSchema = z.object({
  lesson_id: z.string().min(1),
  unlock_condition: unlockConditionSchema,
  title: z.string().min(2),
  pass_mark: z.coerce.number().int().min(0).max(100),
  time_limit: z.coerce.number().int().min(1),
  max_attempt: z.coerce.number().int().min(1),
  publish_status: lessonPublishStatusSchema,
  questions: z.array(quizQuestionSchema).min(1),
});

export const smartNoteFormSchema = z.object({
  lesson_id: z.string().min(1),
  unlock_condition: unlockConditionSchema,
  note_title_en: z.string().min(2),
  note_title_bn: z.string().min(2),
  pdf_upload: z.string().url().or(z.literal("")),
  note_template: z.string().default(""),
  downloadable: z.boolean(),
  allow_student_personal_note: z.boolean(),
  publish_status: lessonPublishStatusSchema,
});

export const lessonIdParamSchema = z.object({
  id: z.string().min(1),
});

export const reorderSchema = z.object({
  lessonId: z.string().min(1),
  contentIds: z.array(z.string().min(1)).min(1),
});

export const learningFlowSaveSchema = z.object({
  steps: z.array(z.any()),
});

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export const lessonValidation = {
  byId: { params: lessonIdParamSchema },
  create: { body: lessonFormSchema },
  update: { params: lessonIdParamSchema, body: lessonFormSchema.partial() },
  updateStatus: {
    params: lessonIdParamSchema,
    body: z.object({ publish_status: lessonPublishStatusSchema }),
  },
  bulkDelete: { body: bulkDeleteSchema },
  lessonContentCreate: { body: lessonContentCreateSchema },
  lessonContentUpdate: {
    params: z.object({ contentId: z.string().min(1) }),
    body: lessonContentUpdateSchema,
  },
  lessonContentReorder: { body: reorderSchema },
  byLesson: { params: z.object({ lessonId: z.string().min(1) }) },
  quizCreate: { body: quizFormSchema },
  quizUpdate: { params: lessonIdParamSchema, body: quizFormSchema },
  smartNoteCreate: { body: smartNoteFormSchema },
  smartNoteUpdate: { params: lessonIdParamSchema, body: smartNoteFormSchema },
  learningFlowSave: {
    params: z.object({ lessonId: z.string().min(1) }),
    body: learningFlowSaveSchema,
  },
};

export type LessonInput = z.infer<typeof lessonFormSchema>;
