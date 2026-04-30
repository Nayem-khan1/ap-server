import { z } from "zod";

const blogTextBlockSchema = z.object({
  type: z.literal("text"),
  value_en: z.string().trim().min(1),
  value_bn: z.string().trim().min(1),
  rich_text_en: z.record(z.string(), z.any()).optional(),
  rich_text_bn: z.record(z.string(), z.any()).optional(),
});

const blogHeadingBlockSchema = z.object({
  type: z.literal("heading"),
  value_en: z.string().trim().min(1),
  value_bn: z.string().trim().min(1),
  level: z.number().int().min(1).max(3).optional().default(2),
});

const blogImageBlockSchema = z.object({
  type: z.literal("image"),
  url: z.string().trim().url(),
  caption_en: z.string().trim().optional().default(""),
  caption_bn: z.string().trim().optional().default(""),
});

const blogContentBlockSchema = z.union([
  blogTextBlockSchema,
  blogHeadingBlockSchema,
  blogImageBlockSchema,
]);

export const blogContentBlocksSchema = z
  .array(blogContentBlockSchema)
  .min(1);

export const blogFormSchema = z.object({
  title_en: z.string().min(2),
  title_bn: z.string().min(2),
  content_blocks: blogContentBlocksSchema,
  content_en: z.string().optional(),
  content_bn: z.string().optional(),
  excerpt_en: z.string().optional(),
  excerpt_bn: z.string().optional(),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  category: z.string().min(2),
  category_slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  tags: z.array(z.string()).optional(),
  tags_csv: z.string().optional(),
  thumbnail: z.string().url().or(z.literal("")).optional(),
  featured_image: z.string().url().or(z.literal("")),
  seo_title: z.string().min(2),
  seo_description: z.string().min(5),
  author: z.string().min(2).default("Editorial Team"),
  publish_status: z.enum(["draft", "published", "archived"]),
  published_at: z.string().datetime().optional(),
  read_time: z.string().optional(),
});

export const blogIdParamSchema = z.object({
  id: z.string().min(1),
});

export const updateBlogSchema = blogFormSchema.partial();

export const updateBlogStatusSchema = z.object({
  publish_status: z.enum(["draft", "published", "archived"]),
});

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export const blogCategoryFormSchema = z.object({
  title: z.string().trim().min(2),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  description: z.string().trim().optional().default(""),
  publish_status: z.enum(["draft", "published"]).default("published"),
});

export const updateBlogCategorySchema = blogCategoryFormSchema.partial();

export const bulkDeleteBlogCategoriesSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export const blogValidation = {
  create: { body: blogFormSchema },
  update: { params: blogIdParamSchema, body: updateBlogSchema },
  updateStatus: { params: blogIdParamSchema, body: updateBlogStatusSchema },
  bulkDelete: { body: bulkDeleteSchema },
  createCategory: { body: blogCategoryFormSchema },
  updateCategory: { params: blogIdParamSchema, body: updateBlogCategorySchema },
  bulkDeleteCategories: { body: bulkDeleteBlogCategoriesSchema },
};
