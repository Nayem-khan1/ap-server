import mongoose, { Model, Schema, model } from "mongoose";
import { applyDefaultJsonTransform } from "../../utils/mongoose-transform";

export interface IEnrollment {
  student_id: string;
  student_name: string;
  course_id: string;
  course_name: string;
  enrolled_at: string;
  enrollment_type: "auto" | "manual";
  payment_status: "paid" | "free" | "pending";
  progress_percent: number;
  completed_lessons: string[];
  completed_at: string | null;
  status: "active" | "paused" | "completed";
  access_status: "active" | "locked";
  batch_id?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProgress {
  student_id: string;
  student_name: string;
  course: string;
  lesson: string;
  current_step: string;
  video_watch_percent: number;
  quiz_score: number;
  smart_note_generated: boolean;
  completion_status: "in_progress" | "completed" | "stalled";
  createdAt: Date;
  updatedAt: Date;
}

const enrollmentSchema = new Schema<IEnrollment>(
  {
    student_id: { type: String, required: true, index: true },
    student_name: { type: String, required: true },
    course_id: { type: String, required: true, index: true },
    course_name: { type: String, required: true },
    enrolled_at: { type: String, required: true },
    enrollment_type: { type: String, enum: ["auto", "manual"], required: true },
    payment_status: { type: String, enum: ["paid", "free", "pending"], required: true },
    progress_percent: { type: Number, min: 0, max: 100, default: 0 },
    completed_lessons: { type: [String], default: [] },
    completed_at: { type: String, default: null },
    status: { type: String, enum: ["active", "paused", "completed"], required: true },
    access_status: { type: String, enum: ["active", "locked"], default: "active" },
    batch_id: { type: String, default: undefined },
  },
  { timestamps: true },
);

enrollmentSchema.index({ student_id: 1, course_id: 1 }, { unique: true });

const progressSchema = new Schema<IProgress>(
  {
    student_id: { type: String, required: true, index: true },
    student_name: { type: String, required: true },
    course: { type: String, required: true },
    lesson: { type: String, required: true },
    current_step: { type: String, required: true },
    video_watch_percent: { type: Number, min: 0, max: 100, default: 0 },
    quiz_score: { type: Number, min: 0, max: 100, default: 0 },
    smart_note_generated: { type: Boolean, default: false },
    completion_status: {
      type: String,
      enum: ["in_progress", "completed", "stalled"],
      default: "in_progress",
    },
  },
  { timestamps: true },
);

applyDefaultJsonTransform(enrollmentSchema);
applyDefaultJsonTransform(progressSchema);

type EnrollmentModel = Model<IEnrollment>;
type ProgressModel = Model<IProgress>;

export const EnrollmentModel =
  (mongoose.models.Enrollment as EnrollmentModel | undefined) ||
  model<IEnrollment>("Enrollment", enrollmentSchema);

export const ProgressModel =
  (mongoose.models.Progress as ProgressModel | undefined) ||
  model<IProgress>("Progress", progressSchema);

