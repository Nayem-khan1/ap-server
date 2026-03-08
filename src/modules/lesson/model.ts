import mongoose, { Model, Schema, model } from "mongoose";
import { applyDefaultJsonTransform } from "../../utils/mongoose-transform";

export type CoursePublishStatus = "draft" | "published";
export type ContentType = "video" | "pdf" | "quiz" | "assignment" | "resource";
export type QuestionType = "MCQ" | "MULTIPLE_SELECT" | "TRUE_FALSE";
export type UnlockCondition =
  | "auto_unlock"
  | "after_previous_completed"
  | "after_quiz_pass";

export interface ILesson {
  course_id: string;
  module_title_en: string;
  module_title_bn: string;
  module_id: string;
  title_en: string;
  title_bn: string;
  order_no: number;
  publish_status: CoursePublishStatus;
  createdAt: Date;
  updatedAt: Date;
  // No deprecated fields
}

export interface IQuizQuestion {
  id: string;
  question_en: string;
  question_bn: string;
  question_type: QuestionType;
  options: string[];
  correct_answer: string | string[];
  explanation_en: string;
  explanation_bn: string;
}

export interface ILessonContent {
  course_id?: string;
  lesson_id: string;
  type: ContentType;
  order_no: number;
  is_preview?: boolean;
  video_data?: {
    url: string;
    provider?: string;
    duration?: string;
    thumbnail?: string;
  };
  pdf_data?: {
    file_url: string;
    downloadable: boolean;
  };
  quiz_data?: {
    title: string;
    time_limit: number;
    pass_mark: number;
    questions: any[];
  };

  unlock_condition: UnlockCondition;
  createdAt: Date;
  updatedAt: Date;
}

const quizQuestionSchema = new Schema<IQuizQuestion>(
  {
    id: { type: String, required: true },
    question_en: { type: String, required: true },
    question_bn: { type: String, required: true },
    question_type: {
      type: String,
      enum: ["MCQ", "MULTIPLE_SELECT", "TRUE_FALSE"],
      required: true,
    },
    options: { type: [String], default: [] },
    correct_answer: { type: Schema.Types.Mixed, required: true },
    explanation_en: { type: String, default: "" },
    explanation_bn: { type: String, default: "" },
  },
  { _id: false },
);

const lessonSchema = new Schema<ILesson>(
  {
    course_id: { type: String, required: true, index: true },
    module_title_en: { type: String, required: true },
    module_title_bn: { type: String, required: true },
    module_id: { type: String, required: true, index: true },
    title_en: { type: String, required: true },
    title_bn: { type: String, required: true },
    order_no: { type: Number, required: true, min: 1 },
    publish_status: {
      type: String,
      enum: ["draft", "published"],
      required: true,
    },
  },
  { timestamps: true },
);

lessonSchema.index({ module_id: 1, order_no: 1 }, { unique: true });

const lessonContentSchema = new Schema<ILessonContent>(
  {
    course_id: { type: String, index: true },
    lesson_id: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["video", "pdf", "quiz", "assignment", "resource"],
      required: true,
    },
    order_no: { type: Number, required: true, min: 1 },
    is_preview: { type: Boolean, default: false },

    // V2 Data Mappings
    video_data: { type: Schema.Types.Mixed },
    pdf_data: { type: Schema.Types.Mixed },
    quiz_data: { type: Schema.Types.Mixed },

    unlock_condition: {
      type: String,
      enum: ["auto_unlock", "after_previous_completed", "after_quiz_pass"],
      default: "after_previous_completed",
    },
  },
  { timestamps: true },
);

lessonContentSchema.index({ lesson_id: 1, order_no: 1 }, { unique: true });

applyDefaultJsonTransform(lessonSchema);
applyDefaultJsonTransform(lessonContentSchema);

type LessonModel = Model<ILesson>;
type LessonContentModel = Model<ILessonContent>;

export const LessonModel =
  (mongoose.models.Lesson as LessonModel | undefined) ||
  model<ILesson>("Lesson", lessonSchema);

export const LessonContentModel =
  (mongoose.models.LessonContent as LessonContentModel | undefined) ||
  model<ILessonContent>("LessonContent", lessonContentSchema);
