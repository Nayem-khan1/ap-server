import { z } from "zod";

export const courseStatusSchema = z.enum(["draft", "published"]);
export const courseLevelSchema = z.enum([
  "beginner",
  "intermediate",
  "advanced",
  "all_levels",
]);
export const courseHighlightAnimationSchema = z.enum(["none", "pulse", "blink"]);

const youtubeUrlRegex =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[A-Za-z0-9_-]{6,}.*$/;

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  sort_by: z.string().optional(),
  sort_order: z.enum(["asc", "desc"]).optional(),
  publish_status: courseStatusSchema.optional(),
});

const courseFormBaseSchema = z.object({
    title_en: z.string().min(2),
    title_bn: z.string().min(2),
    subtitle_en: z.string().min(2),
    subtitle_bn: z.string().min(2),
    description_en: z.string().min(10),
    description_bn: z.string().min(10),
    slug: z.string().min(2),
    category_id: z.string().min(1),
    thumbnail: z.any().optional(),
    requirements_en: z.array(z.object({ value: z.string().min(1) })).default([]),
    requirements_bn: z.array(z.object({ value: z.string().min(1) })).default([]),
    learning_objectives_en: z
      .array(z.object({ value: z.string().min(1) }))
      .default([]),
    learning_objectives_bn: z
      .array(z.object({ value: z.string().min(1) }))
      .default([]),
    targeted_audience_en: z.array(z.object({ value: z.string().min(1) })).default([]),
    targeted_audience_bn: z.array(z.object({ value: z.string().min(1) })).default([]),
    faqs: z
      .array(
        z.object({
          question_en: z.string().min(1),
          answer_en: z.string().min(1),
          question_bn: z.string().min(1),
          answer_bn: z.string().min(1),
        }),
      )
      .default([]),
    intro_video_url: z.string().min(1).regex(youtubeUrlRegex),
    instructor_ids: z.array(z.string()).default([]),
    level: courseLevelSchema.default("beginner"),
    language: z.string().min(1).default("bn"),
    grade: z.string().optional(),
    is_popular: z.boolean().default(false),
    highlight_animation: courseHighlightAnimationSchema.default("none"),
    is_free: z.boolean(),
    price: z.coerce.number().min(0),
    discount_price: z.coerce.number().min(0),
    publish_status: courseStatusSchema,
  });

export const courseFormSchema = courseFormBaseSchema.superRefine((values, ctx) => {
    if (!values.is_free && values.price <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price"],
        message: "Paid course price must be greater than 0.",
      });
    }

    if (values.is_free && values.price !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price"],
        message: "Free course price must be 0.",
      });
    }

    if (values.discount_price > values.price) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["discount_price"],
        message: "Discount price cannot exceed regular price.",
      });
    }
  });

export const courseCategoryFormSchema = z.object({
  title_en: z.string().min(2),
  title_bn: z.string().min(2),
  description_en: z.string().min(10),
  description_bn: z.string().min(10),
  slug: z.string().min(2),
  thumbnail: z.any().optional(),
  publish_status: courseStatusSchema,
});

export const publishStatusUpdateSchema = z.object({
  publish_status: courseStatusSchema,
});

export const courseIdParamSchema = z.object({
  id: z.string().min(1),
});

export const moduleIdParamSchema = z.object({
  moduleId: z.string().min(1),
});

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export const moduleFormSchema = z.object({
  course_id: z.string().min(1),
  title_en: z.string().min(1),
  title_bn: z.string().min(1),
});

export const moduleUpdateSchema = moduleFormSchema.partial();

export const courseValidation = {
  list: { query: listQuerySchema },
  byId: { params: courseIdParamSchema },
  create: { body: courseFormSchema },
  update: { params: courseIdParamSchema, body: courseFormBaseSchema.partial() },
  updateStatus: { params: courseIdParamSchema, body: publishStatusUpdateSchema },
  bulkDelete: { body: bulkDeleteSchema },
  createCategory: { body: courseCategoryFormSchema },
  updateCategory: { params: courseIdParamSchema, body: courseCategoryFormSchema.partial() },
  updateCategoryStatus: {
    params: courseIdParamSchema,
    body: publishStatusUpdateSchema,
  },
  listModulesByCourse: {
    params: z.object({ courseId: z.string().min(1) }),
  },
  createModule: { body: moduleFormSchema },
  updateModule: { params: moduleIdParamSchema, body: moduleUpdateSchema },
};

export type CourseInput = z.infer<typeof courseFormSchema>;
export type CourseCategoryInput = z.infer<typeof courseCategoryFormSchema>;
export type ModuleInput = z.infer<typeof moduleFormSchema>;


