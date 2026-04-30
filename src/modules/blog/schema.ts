import { z } from "zod";

const blogSlugSchema = z.string().trim().regex(/^[a-z0-9-]+$/);
const richTextDocumentSchema = z.record(z.string(), z.any());

const blogCategoryReferenceSchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    name: z.string().trim().min(2).optional(),
    title: z.string().trim().min(2).optional(),
    slug: blogSlugSchema.optional(),
  })
  .refine(
    (value) => Boolean(value.id || value.name || value.title || value.slug),
    "Category reference is required",
  );

const blogAuthorReferenceSchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    name: z.string().trim().min(2).optional(),
    avatar: z.string().trim().url().or(z.literal("")).optional(),
    bio: z.string().trim().optional(),
  })
  .refine((value) => Boolean(value.id || value.name), "Author reference is required");

const blogSeoSchema = z.object({
  meta_title: z.string().trim().min(2),
  meta_description: z.string().trim().min(5),
});

const blogTextBlockSchema = z.object({
  type: z.literal("text"),
  value_en: z.string().trim().min(1),
  value_bn: z.string().trim().min(1),
  rich_text_en: richTextDocumentSchema.optional(),
  rich_text_bn: richTextDocumentSchema.optional(),
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

const blogQuoteBlockSchema = z.object({
  type: z.literal("quote"),
  value_en: z.string().trim().min(1),
  value_bn: z.string().trim().min(1),
});

const blogContentBlockSchema = z.union([
  blogTextBlockSchema,
  blogHeadingBlockSchema,
  blogImageBlockSchema,
  blogQuoteBlockSchema,
]);

export const blogContentBlocksSchema = z.array(blogContentBlockSchema).min(1);

const baseBlogFormSchema = z.object({
  title_en: z.string().min(2),
  title_bn: z.string().min(2),
  content_blocks: blogContentBlocksSchema,
  content_en: z.string().optional(),
  content_bn: z.string().optional(),
  excerpt_en: z.string().optional(),
  excerpt_bn: z.string().optional(),
  slug: blogSlugSchema.min(2),
  category_id: z.string().trim().min(1).optional(),
  category: z.union([z.string().trim().min(2), blogCategoryReferenceSchema]).optional(),
  category_slug: blogSlugSchema.optional(),
  tags: z.array(z.string()).optional(),
  tags_csv: z.string().optional(),
  thumbnail: z.string().url().or(z.literal("")).optional(),
  featured_image: z.string().url().or(z.literal("")).optional(),
  seo: blogSeoSchema.optional(),
  seo_title: z.string().min(2).optional(),
  seo_description: z.string().min(5).optional(),
  author_id: z.string().trim().min(1).optional(),
  author: z.union([z.string().trim().min(2), blogAuthorReferenceSchema]).optional(),
  author_avatar: z.string().trim().url().or(z.literal("")).optional(),
  author_bio: z.string().trim().optional(),
  publish_status: z.enum(["draft", "published", "archived"]),
  published_at: z.string().datetime().optional(),
  read_time: z.string().optional(),
});

export const blogFormSchema = baseBlogFormSchema.superRefine((value, ctx) => {
  if (!value.category_id && !value.category) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["category_id"],
      message: "Category is required",
    });
  }

  if (!value.author_id && !value.author) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["author_id"],
      message: "Author is required",
    });
  }

  const metaTitle = value.seo?.meta_title ?? value.seo_title;
  const metaDescription = value.seo?.meta_description ?? value.seo_description;

  if (!metaTitle) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["seo_title"],
      message: "SEO title is required",
    });
  }

  if (!metaDescription) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["seo_description"],
      message: "SEO description is required",
    });
  }
});

export const blogIdParamSchema = z.object({
  id: z.string().min(1),
});

export const updateBlogSchema = baseBlogFormSchema.partial();

export const updateBlogStatusSchema = z.object({
  publish_status: z.enum(["draft", "published", "archived"]),
});

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export const blogCategoryFormSchema = z.object({
  title: z.string().trim().min(2),
  slug: blogSlugSchema.optional().or(z.literal("")),
  description: z.string().trim().optional().default(""),
  publish_status: z.enum(["draft", "published"]).default("published"),
});

export const updateBlogCategorySchema = blogCategoryFormSchema.partial();

export const bulkDeleteBlogCategoriesSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export const blogAuthorFormSchema = z.object({
  name: z.string().trim().min(2),
  avatar: z.string().trim().url().or(z.literal("")).optional().default(""),
  bio: z.string().trim().optional().default(""),
});

export const updateBlogAuthorSchema = blogAuthorFormSchema.partial();

export const bulkDeleteBlogAuthorsSchema = z.object({
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
  createAuthor: { body: blogAuthorFormSchema },
  updateAuthor: { params: blogIdParamSchema, body: updateBlogAuthorSchema },
  bulkDeleteAuthors: { body: bulkDeleteBlogAuthorsSchema },
};
