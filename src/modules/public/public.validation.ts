import { z } from "zod";

const languageSchema = z.enum(["bn", "en"]).default("en");
const booleanQuerySchema = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") {
      return true;
    }
    if (normalized === "false" || normalized === "0") {
      return false;
    }
  }

  return value;
}, z.boolean().optional());

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(10),
});

const listCoursesQuerySchema = paginationQuerySchema
  .extend({
    category_id: z.string().trim().optional(),
    price_type: z.enum(["free", "paid"]).optional(),
    min_price: z.coerce.number().min(0).optional(),
    max_price: z.coerce.number().min(0).optional(),
    popular_only: booleanQuerySchema,
    lang: languageSchema,
  })
  .refine(
    (value) =>
      typeof value.min_price === "undefined" ||
      typeof value.max_price === "undefined" ||
      value.max_price >= value.min_price,
    {
      message: "max_price must be greater than or equal to min_price",
      path: ["max_price"],
    },
  );

const listBlogsQuerySchema = paginationQuerySchema.extend({
  category: z.string().trim().optional(),
  tag: z.string().trim().optional(),
  lang: languageSchema,
});

const listCourseCategoriesQuerySchema = z.object({
  lang: languageSchema,
});

const listEventsQuerySchema = paginationQuerySchema.extend({
  lang: languageSchema,
});

const listInstructorsQuerySchema = paginationQuerySchema;

const listTestimonialsQuerySchema = paginationQuerySchema.extend({
  lang: languageSchema,
});

const slugParamSchema = z.object({
  slug: z.string().trim().min(1),
});

const certificateVerifyQuerySchema = z.object({
  certificate_no: z.string().trim().min(4),
});

export const publicValidation = {
  listCourses: {
    query: listCoursesQuerySchema,
  },
  getCourseBySlug: {
    params: slugParamSchema,
    query: z.object({ lang: languageSchema }),
  },
  listCourseCategories: {
    query: listCourseCategoriesQuerySchema,
  },
  listBlogs: {
    query: listBlogsQuerySchema,
  },
  getBlogBySlug: {
    params: slugParamSchema,
    query: z.object({ lang: languageSchema }),
  },
  listEvents: {
    query: listEventsQuerySchema,
  },
  listInstructors: {
    query: listInstructorsQuerySchema,
  },
  listTestimonials: {
    query: listTestimonialsQuerySchema,
  },
  getEventBySlug: {
    params: slugParamSchema,
    query: z.object({ lang: languageSchema }),
  },
  verifyCertificate: {
    query: certificateVerifyQuerySchema,
  },
};

export type ListCoursesQuery = z.infer<typeof listCoursesQuerySchema>;
export type ListCourseCategoriesQuery = z.infer<typeof listCourseCategoriesQuerySchema>;
export type ListBlogsQuery = z.infer<typeof listBlogsQuerySchema>;
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;
export type ListInstructorsQuery = z.infer<typeof listInstructorsQuerySchema>;
export type ListTestimonialsQuery = z.infer<typeof listTestimonialsQuerySchema>;


