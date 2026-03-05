import mongoose, { Model, Schema, model } from "mongoose";
import { applyDefaultJsonTransform } from "../../utils/mongoose-transform";

export type CoursePublishStatus = "draft" | "published";
export type ContentType = "video" | "quiz" | "note";
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
  lesson_type: "video";
  youtube_unlisted_url: string;
  duration: string;
  quiz_id: string | null;
  smart_note_id: string | null;
  order_no: number;
  publish_status: CoursePublishStatus;
  createdAt: Date;
  updatedAt: Date;
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
  lesson_id: string;
  type: ContentType;
  order_no: number;
  video_url: string;
  video_duration: string;
  quiz_title: string;
  quiz_pass_mark: number;
  quiz_time_limit: number;
  quiz_max_attempt: number;
  quiz_publish_status: CoursePublishStatus;
  quiz_questions: IQuizQuestion[];
  note_title_en: string;
  note_title_bn: string;
  note_content: string;
  note_pdf_url: string;
  note_template: string;
  note_downloadable: boolean;
  note_allow_student_personal_note: boolean;
  note_publish_status: CoursePublishStatus;
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
    lesson_type: { type: String, enum: ["video"], default: "video" },
    youtube_unlisted_url: { type: String, default: "" },
    duration: { type: String, default: "" },
    quiz_id: { type: String, default: null },
    smart_note_id: { type: String, default: null },
    order_no: { type: Number, required: true, min: 1 },
    publish_status: { type: String, enum: ["draft", "published"], required: true },
  },
  { timestamps: true },
);

lessonSchema.index({ module_id: 1, order_no: 1 }, { unique: true });

const lessonContentSchema = new Schema<ILessonContent>(
  {
    lesson_id: { type: String, required: true, index: true },
    type: { type: String, enum: ["video", "quiz", "note"], required: true },
    order_no: { type: Number, required: true, min: 1 },
    video_url: { type: String, default: "" },
    video_duration: { type: String, default: "" },
    quiz_title: { type: String, default: "" },
    quiz_pass_mark: { type: Number, default: 70, min: 0, max: 100 },
    quiz_time_limit: { type: Number, default: 0, min: 0 },
    quiz_max_attempt: { type: Number, default: 1, min: 1 },
    quiz_publish_status: { type: String, enum: ["draft", "published"], default: "draft" },
    quiz_questions: { type: [quizQuestionSchema], default: [] },
    note_title_en: { type: String, default: "" },
    note_title_bn: { type: String, default: "" },
    note_content: { type: String, default: "" },
    note_pdf_url: { type: String, default: "" },
    note_template: { type: String, default: "" },
    note_downloadable: { type: Boolean, default: false },
    note_allow_student_personal_note: { type: Boolean, default: false },
    note_publish_status: { type: String, enum: ["draft", "published"], default: "draft" },
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
