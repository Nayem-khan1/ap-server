import { z } from "zod";

const languageSchema = z.enum(["bn", "en"]).default("en");

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(10),
});

const listCoursesQuerySchema = paginationQuerySchema
  .extend({
    grade: z.string().trim().optional(),
    min_price: z.coerce.number().min(0).optional(),
    max_price: z.coerce.number().min(0).optional(),
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

const listEventsQuerySchema = paginationQuerySchema.extend({
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
  getEventBySlug: {
    params: slugParamSchema,
    query: z.object({ lang: languageSchema }),
  },
  verifyCertificate: {
    query: certificateVerifyQuerySchema,
  },
};

export type ListCoursesQuery = z.infer<typeof listCoursesQuerySchema>;
export type ListBlogsQuery = z.infer<typeof listBlogsQuerySchema>;
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;
