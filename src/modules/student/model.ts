import mongoose, { Model, Schema, model } from "mongoose";
import { applyDefaultJsonTransform } from "../../utils/mongoose-transform";

export type LearningStep = "video" | "quiz" | "note" | "completed";
export type StudentActivityType = "login" | "lesson_completed";

export interface IStudentLessonProgress {
  student_id: string;
  course_id: string;
  module_id: string;
  lesson_id: string;
  video_watch_percent: number;
  video_completed: boolean;
  quiz_completed: boolean;
  quiz_score: number;
  note_completed: boolean;
  lesson_completed: boolean;
  current_step: LearningStep;
  completed_at: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStudentActivity {
  student_id: string;
  type: StudentActivityType;
  course_id?: string;
  lesson_id?: string;
  occurred_at: string;
  createdAt: Date;
  updatedAt: Date;
}

const studentLessonProgressSchema = new Schema<IStudentLessonProgress>(
  {
    student_id: { type: String, required: true, index: true },
    course_id: { type: String, required: true, index: true },
    module_id: { type: String, required: true, index: true },
    lesson_id: { type: String, required: true, index: true },
    video_watch_percent: { type: Number, min: 0, max: 100, default: 0 },
    video_completed: { type: Boolean, default: false },
    quiz_completed: { type: Boolean, default: false },
    quiz_score: { type: Number, min: 0, max: 100, default: 0 },
    note_completed: { type: Boolean, default: false },
    lesson_completed: { type: Boolean, default: false },
    current_step: {
      type: String,
      enum: ["video", "quiz", "note", "completed"],
      default: "video",
    },
    completed_at: { type: String, default: null },
  },
  { timestamps: true },
);

studentLessonProgressSchema.index(
  { student_id: 1, course_id: 1, lesson_id: 1 },
  { unique: true },
);
studentLessonProgressSchema.index({ student_id: 1, updatedAt: -1 });

const studentActivitySchema = new Schema<IStudentActivity>(
  {
    student_id: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["login", "lesson_completed"],
      required: true,
      index: true,
    },
    course_id: { type: String, default: undefined, index: true },
    lesson_id: { type: String, default: undefined, index: true },
    occurred_at: { type: String, required: true, index: true },
  },
  { timestamps: true },
);

studentActivitySchema.index({ student_id: 1, occurred_at: -1 });

applyDefaultJsonTransform(studentLessonProgressSchema);
applyDefaultJsonTransform(studentActivitySchema);

type StudentLessonProgressModel = Model<IStudentLessonProgress>;
type StudentActivityModel = Model<IStudentActivity>;

export const StudentLessonProgressModel =
  (mongoose.models.StudentLessonProgress as StudentLessonProgressModel | undefined) ||
  model<IStudentLessonProgress>(
    "StudentLessonProgress",
    studentLessonProgressSchema,
  );

export const StudentActivityModel =
  (mongoose.models.StudentActivity as StudentActivityModel | undefined) ||
  model<IStudentActivity>("StudentActivity", studentActivitySchema);
