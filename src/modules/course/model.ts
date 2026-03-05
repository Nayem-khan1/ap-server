import mongoose, { Model, Schema, model } from "mongoose";
import { applyDefaultJsonTransform } from "../../utils/mongoose-transform";

type CoursePublishStatus = "draft" | "published";
type CourseLevel = "beginner" | "intermediate" | "advanced" | "all_levels";

export interface ICourseFaq {
  question_en: string;
  answer_en: string;
  question_bn: string;
  answer_bn: string;
}

export interface ICourse {
  title_en: string;
  title_bn: string;
  subtitle_en: string;
  subtitle_bn: string;
  slug: string;
  category_id: string;
  thumbnail?: string;
  intro_video_url: string;
  description_en: string;
  description_bn: string;
  requirements_en: string[];
  requirements_bn: string[];
  learning_objectives_en: string[];
  learning_objectives_bn: string[];
  targeted_audience_en: string[];
  targeted_audience_bn: string[];
  faqs: ICourseFaq[];
  instructor_ids: string[];
  level: CourseLevel;
  language: string;
  grade: string;
  duration: string;
  total_lessons: number;
  is_free: boolean;
  price: number;
  discount_price: number;
  publish_status: CoursePublishStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICourseCategory {
  title_en: string;
  title_bn: string;
  description_en: string;
  description_bn: string;
  slug: string;
  thumbnail?: string;
  publish_status: CoursePublishStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICourseModule {
  course_id: string;
  title_en: string;
  title_bn: string;
  order_no: number;
  createdAt: Date;
  updatedAt: Date;
}

const faqSchema = new Schema<ICourseFaq>(
  {
    question_en: { type: String, required: true },
    answer_en: { type: String, required: true },
    question_bn: { type: String, required: true },
    answer_bn: { type: String, required: true },
  },
  { _id: false },
);

const courseSchema = new Schema<ICourse>(
  {
    title_en: { type: String, required: true, trim: true },
    title_bn: { type: String, required: true, trim: true },
    subtitle_en: { type: String, required: true, trim: true },
    subtitle_bn: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, index: true },
    category_id: { type: String, required: true, index: true },
    thumbnail: { type: String, default: "" },
    intro_video_url: { type: String, default: "" },
    description_en: { type: String, required: true },
    description_bn: { type: String, required: true },
    requirements_en: { type: [String], default: [] },
    requirements_bn: { type: [String], default: [] },
    learning_objectives_en: { type: [String], default: [] },
    learning_objectives_bn: { type: [String], default: [] },
    targeted_audience_en: { type: [String], default: [] },
    targeted_audience_bn: { type: [String], default: [] },
    faqs: { type: [faqSchema], default: [] },
    instructor_ids: { type: [String], default: [] },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", "all_levels"],
      default: "beginner",
    },
    language: { type: String, default: "bn" },
    grade: { type: String, default: "" },
    duration: { type: String, default: "" },
    total_lessons: { type: Number, default: 0, min: 0 },
    is_free: { type: Boolean, required: true },
    price: { type: Number, required: true, min: 0 },
    discount_price: { type: Number, required: true, min: 0 },
    publish_status: { type: String, enum: ["draft", "published"], required: true },
  },
  { timestamps: true },
);

courseSchema.index({ publish_status: 1, createdAt: -1 });

const categorySchema = new Schema<ICourseCategory>(
  {
    title_en: { type: String, required: true, trim: true },
    title_bn: { type: String, required: true, trim: true },
    description_en: { type: String, required: true },
    description_bn: { type: String, required: true },
    slug: { type: String, required: true, unique: true, trim: true },
    thumbnail: { type: String, default: "" },
    publish_status: { type: String, enum: ["draft", "published"], required: true },
  },
  { timestamps: true },
);

const moduleSchema = new Schema<ICourseModule>(
  {
    course_id: { type: String, required: true, index: true },
    title_en: { type: String, required: true },
    title_bn: { type: String, required: true },
    order_no: { type: Number, required: true, min: 1 },
  },
  { timestamps: true },
);

moduleSchema.index({ course_id: 1, order_no: 1 }, { unique: true });

applyDefaultJsonTransform(courseSchema);
applyDefaultJsonTransform(categorySchema);
applyDefaultJsonTransform(moduleSchema);

type CourseModel = Model<ICourse>;
type CategoryModel = Model<ICourseCategory>;
type ModuleModel = Model<ICourseModule>;

export const CourseModel =
  (mongoose.models.Course as CourseModel | undefined) ||
  model<ICourse>("Course", courseSchema);

export const CourseCategoryModel =
  (mongoose.models.CourseCategory as CategoryModel | undefined) ||
  model<ICourseCategory>("CourseCategory", categorySchema);

export const CourseModuleModel =
  (mongoose.models.CourseModule as ModuleModel | undefined) ||
  model<ICourseModule>("CourseModule", moduleSchema);
