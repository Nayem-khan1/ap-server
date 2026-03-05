import { z } from "zod";

export const blogFormSchema = z.object({
  title_en: z.string().min(2),
  title_bn: z.string().min(2),
  content_en: z.string().min(20),
  content_bn: z.string().min(20),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  category: z.string().min(2),
  tags: z.array(z.string()).optional(),
  tags_csv: z.string().optional(),
  featured_image: z.string().url().or(z.literal("")),
  seo_title: z.string().min(2),
  seo_description: z.string().min(5),
  author: z.string().min(2).default("Editorial Team"),
  publish_status: z.enum(["draft", "published", "archived"]),
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

export const blogValidation = {
  create: { body: blogFormSchema },
  update: { params: blogIdParamSchema, body: updateBlogSchema },
  updateStatus: { params: blogIdParamSchema, body: updateBlogStatusSchema },
  bulkDelete: { body: bulkDeleteSchema },
};
