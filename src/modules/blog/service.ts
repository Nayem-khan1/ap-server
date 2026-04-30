import { StatusCodes } from "http-status-codes";
import { AppError } from "../../errors/app-error";
import {
  BlogCategoryModel,
  BlogModel,
  type BlogCategoryPublishStatus,
  type BlogPublishStatus,
  type IBlogContentBlock,
  type BlogRichTextDocument,
} from "./model";

function parseTagsCsv(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\r\n/g, "\n").trim();
}

function normalizeRichTextDocument(value: unknown): BlogRichTextDocument | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as BlogRichTextDocument;
}

function normalizeBlogStatus(value: unknown, fallback: BlogPublishStatus): BlogPublishStatus {
  return value === "published" || value === "archived" || value === "draft"
    ? value
    : fallback;
}

function normalizeCategoryStatus(
  value: unknown,
  fallback: BlogCategoryPublishStatus,
): BlogCategoryPublishStatus {
  return value === "published" || value === "draft" ? value : fallback;
}

function buildExcerpt(value: string, maxLength = 180): string {
  const plain = value.replace(/\s+/g, " ").trim();
  if (!plain) return "";
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength).replace(/\s+\S*$/, "").trimEnd()}...`;
}

function splitLegacyParagraphs(value: string): string[] {
  return value
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeLegacyBlocks(contentEn: string, contentBn: string): IBlogContentBlock[] {
  const english = splitLegacyParagraphs(contentEn);
  const bangla = splitLegacyParagraphs(contentBn);
  const total = Math.max(english.length, bangla.length);
  const blocks: IBlogContentBlock[] = [];

  for (let index = 0; index < total; index += 1) {
    const valueEn = english[index] ?? bangla[index] ?? "";
    const valueBn = bangla[index] ?? english[index] ?? "";

    if (!valueEn && !valueBn) {
      continue;
    }

    blocks.push({
      type: "text",
      value_en: valueEn,
      value_bn: valueBn,
      url: "",
      caption_en: "",
      caption_bn: "",
      level: 2,
      rich_text_en: null,
      rich_text_bn: null,
      order_no: index,
    });
  }

  return blocks;
}

function normalizeBlock(
  block: unknown,
  index: number,
): IBlogContentBlock | null {
  if (!block || typeof block !== "object" || Array.isArray(block)) {
    return null;
  }

  const record = block as Record<string, unknown>;
  const type = record.type;

  if (type === "image") {
    const url = normalizeText(record.url);
    if (!url) return null;

    return {
      type: "image",
      value_en: "",
      value_bn: "",
      url,
      caption_en: normalizeText(record.caption_en ?? record.caption),
      caption_bn: normalizeText(record.caption_bn ?? record.caption),
      level: 2,
      rich_text_en: null,
      rich_text_bn: null,
      order_no: index,
    };
  }

  if (type === "heading" || type === "text") {
    const valueEn = normalizeText(record.value_en ?? record.value);
    const valueBn = normalizeText(record.value_bn ?? record.value);

    if (!valueEn && !valueBn) {
      return null;
    }

    return {
      type,
      value_en: valueEn || valueBn,
      value_bn: valueBn || valueEn,
      url: "",
      caption_en: "",
      caption_bn: "",
      level:
        type === "heading"
          ? Math.min(3, Math.max(1, Number(record.level ?? 2) || 2))
          : 2,
      rich_text_en:
        type === "text" ? normalizeRichTextDocument(record.rich_text_en) : null,
      rich_text_bn:
        type === "text" ? normalizeRichTextDocument(record.rich_text_bn) : null,
      order_no: index,
    };
  }

  return null;
}

function normalizeContentBlocks(
  blocks: unknown,
  contentEn: unknown,
  contentBn: unknown,
): IBlogContentBlock[] {
  if (Array.isArray(blocks) && blocks.length > 0) {
    const normalized: IBlogContentBlock[] = [];

    blocks.forEach((block, index) => {
      const normalizedBlock = normalizeBlock(block, index);
      if (normalizedBlock) {
        normalized.push(normalizedBlock);
      }
    });

    if (normalized.length > 0) {
      return normalized;
    }
  }

  return normalizeLegacyBlocks(normalizeText(contentEn), normalizeText(contentBn));
}

function serializeBlocksToText(
  blocks: IBlogContentBlock[],
  language: "en" | "bn",
): string {
  const valueKey = language === "en" ? "value_en" : "value_bn";
  const captionKey = language === "en" ? "caption_en" : "caption_bn";

  return blocks
    .sort((left, right) => left.order_no - right.order_no)
    .map((block) => {
      if (block.type === "image") {
        return block[captionKey].trim();
      }
      return block[valueKey].trim();
    })
    .filter(Boolean)
    .join("\n\n");
}

function estimateReadTime(blocks: IBlogContentBlock[]): string {
  const candidate = [serializeBlocksToText(blocks, "en"), serializeBlocksToText(blocks, "bn")]
    .sort((left, right) => right.length - left.length)[0];

  const words = candidate.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 180));
  return `${minutes} min read`;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

function normalizeTags(
  payload: Record<string, unknown>,
  fallback: Record<string, unknown> | undefined,
): string[] {
  if (Array.isArray(payload.tags)) {
    return payload.tags
      .map((item) => normalizeText(item))
      .filter(Boolean);
  }

  if (typeof payload.tags_csv === "string") {
    return parseTagsCsv(payload.tags_csv);
  }

  if (Array.isArray(fallback?.tags)) {
    return fallback.tags
      .map((item) => normalizeText(item))
      .filter(Boolean);
  }

  return [];
}

function resolvePublishedAt(
  payload: Record<string, unknown>,
  fallback: Record<string, unknown> | undefined,
  publishStatus: BlogPublishStatus,
): Date | null {
  const explicitDate = toDate(payload.published_at);
  if (explicitDate) {
    return explicitDate;
  }

  const existingDate = toDate(fallback?.published_at);
  if (existingDate) {
    return existingDate;
  }

  if (publishStatus === "published") {
    return new Date();
  }

  return null;
}

function formatBlogJson(item: { toJSON: () => Record<string, unknown> }) {
  const data = item.toJSON();
  const blocks = normalizeContentBlocks(data.content_blocks, data.content_en, data.content_bn);
  const publishedAt = toDate(data.published_at);
  const thumbnail = normalizeText(data.thumbnail ?? data.featured_image);
  const category = normalizeText(data.category);

  return {
    ...data,
    content_blocks: blocks,
    category,
    category_slug: normalizeText(data.category_slug) || slugify(category),
    thumbnail,
    featured_image: thumbnail,
    read_time: normalizeText(data.read_time) || estimateReadTime(blocks),
    published_at: publishedAt ? publishedAt.toISOString() : null,
  };
}

async function syncMissingCategoriesFromBlogs() {
  const blogs = await BlogModel.find({
    category: { $exists: true, $nin: ["", null] },
  }).select("category category_slug");

  const seen = new Set<string>();
  for (const item of blogs) {
    const data = item.toJSON() as Record<string, unknown>;
    const title = normalizeText(data.category);
    const slug = normalizeText(data.category_slug) || slugify(title);

    if (!title || !slug || seen.has(slug)) {
      continue;
    }

    seen.add(slug);
    await BlogCategoryModel.updateOne(
      { slug },
      {
        $setOnInsert: {
          title,
          slug,
          description: "",
          publish_status: "published",
        },
      },
      { upsert: true },
    );
  }
}

async function buildCategoryUsageMap() {
  const blogs = await BlogModel.find().select("category category_slug publish_status");
  const usage = new Map<
    string,
    { title: string; usage_count: number; published_count: number }
  >();

  for (const item of blogs) {
    const data = item.toJSON() as Record<string, unknown>;
    const title = normalizeText(data.category);
    const slug = normalizeText(data.category_slug) || slugify(title);

    if (!title || !slug) {
      continue;
    }

    const current = usage.get(slug) ?? {
      title,
      usage_count: 0,
      published_count: 0,
    };

    current.usage_count += 1;
    if (data.publish_status === "published") {
      current.published_count += 1;
    }

    usage.set(slug, current);
  }

  return usage;
}

async function ensureCategory(
  categoryTitle: string,
  categorySlug: string,
): Promise<{ title: string; slug: string }> {
  const title = normalizeText(categoryTitle);
  const slug = normalizeText(categorySlug) || slugify(title);

  if (!title || !slug) {
    return { title: "", slug: "" };
  }

  const existing = await BlogCategoryModel.findOne({ slug });
  if (existing) {
    return { title: existing.title, slug: existing.slug };
  }

  const created = await BlogCategoryModel.create({
    title,
    slug,
    description: "",
    publish_status: "published",
  });

  return { title: created.title, slug: created.slug };
}

async function normalizeBlogPayload(
  payload: Record<string, unknown>,
  fallback?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const titleEn = normalizeText(payload.title_en ?? fallback?.title_en);
  const titleBn = normalizeText(payload.title_bn ?? fallback?.title_bn);
  const slug = slugify(normalizeText(payload.slug ?? fallback?.slug ?? titleEn));
  const blocks = normalizeContentBlocks(
    payload.content_blocks ?? fallback?.content_blocks,
    payload.content_en ?? fallback?.content_en,
    payload.content_bn ?? fallback?.content_bn,
  );

  if (!blocks.length) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Blog content must contain at least one block");
  }

  const categoryTitle = normalizeText(payload.category ?? fallback?.category);
  const resolvedCategory = await ensureCategory(
    categoryTitle,
    normalizeText(payload.category_slug ?? fallback?.category_slug),
  );
  const contentEn = serializeBlocksToText(blocks, "en");
  const contentBn = serializeBlocksToText(blocks, "bn");
  const thumbnail = normalizeText(
    payload.thumbnail ??
      payload.featured_image ??
      fallback?.thumbnail ??
      fallback?.featured_image,
  );
  const publishStatus = normalizeBlogStatus(
    payload.publish_status ?? fallback?.publish_status,
    "draft",
  );
  const seoTitle = normalizeText(payload.seo_title ?? fallback?.seo_title) || titleEn;
  const seoDescription =
    normalizeText(payload.seo_description ?? fallback?.seo_description) ||
    buildExcerpt(contentEn);
  const excerptEn =
    normalizeText(payload.excerpt_en ?? fallback?.excerpt_en) || buildExcerpt(contentEn);
  const excerptBn =
    normalizeText(payload.excerpt_bn ?? fallback?.excerpt_bn) || buildExcerpt(contentBn);

  return {
    title_en: titleEn,
    title_bn: titleBn,
    content_blocks: blocks,
    content_en: contentEn,
    content_bn: contentBn,
    excerpt_en: excerptEn,
    excerpt_bn: excerptBn,
    category: resolvedCategory.title || categoryTitle,
    category_slug: resolvedCategory.slug || slugify(categoryTitle),
    tags: normalizeTags(payload, fallback),
    thumbnail,
    featured_image: thumbnail,
    seo_title: seoTitle,
    seo_description: seoDescription,
    slug,
    author: normalizeText(payload.author ?? fallback?.author) || "Editorial Team",
    publish_status: publishStatus,
    published_at: resolvePublishedAt(payload, fallback, publishStatus),
    read_time: estimateReadTime(blocks),
  };
}

export const blogService = {
  async listBlogs() {
    const items = await BlogModel.find().sort({ updatedAt: -1 });
    return items.map((item) => formatBlogJson(item));
  },

  async getBlogById(id: string) {
    const item = await BlogModel.findById(id);
    if (!item) {
      throw new AppError(StatusCodes.NOT_FOUND, "Blog not found");
    }

    return formatBlogJson(item);
  },

  async createBlog(payload: Record<string, unknown>) {
    const normalized = await normalizeBlogPayload(payload);
    const item = await BlogModel.create(normalized);
    return formatBlogJson(item);
  },

  async updateBlog(id: string, payload: Record<string, unknown>) {
    const existing = await BlogModel.findById(id);
    if (!existing) throw new AppError(StatusCodes.NOT_FOUND, "Blog not found");

    const normalized = await normalizeBlogPayload(
      payload,
      existing.toJSON() as Record<string, unknown>,
    );
    existing.set(normalized);
    const item = await existing.save();
    return formatBlogJson(item);
  },

  async setPublishStatus(id: string, publish_status: "draft" | "published" | "archived") {
    const item = await BlogModel.findById(id);
    if (!item) throw new AppError(StatusCodes.NOT_FOUND, "Blog not found");

    item.publish_status = publish_status;
    if (publish_status === "published" && !item.published_at) {
      item.published_at = new Date();
    }

    await item.save();
    return formatBlogJson(item);
  },

  async bulkDelete(ids: string[]) {
    await BlogModel.deleteMany({ _id: { $in: ids } });
    return true;
  },

  async listCategories() {
    await syncMissingCategoriesFromBlogs();
    const usageMap = await buildCategoryUsageMap();
    const items = await BlogCategoryModel.find().sort({ title: 1 });

    return items.map((item) => {
      const data = item.toJSON() as Record<string, unknown>;
      const usage = usageMap.get(String(data.slug ?? ""));

      return {
        ...data,
        usage_count: usage?.usage_count ?? 0,
        published_count: usage?.published_count ?? 0,
      };
    });
  },

  async createCategory(payload: Record<string, unknown>) {
    const title = normalizeText(payload.title);
    const slug = slugify(normalizeText(payload.slug) || title);

    if (!title || !slug) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Category title is required");
    }

    const existing = await BlogCategoryModel.findOne({ slug });
    if (existing) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Category slug already exists");
    }

    const item = await BlogCategoryModel.create({
      title,
      slug,
      description: normalizeText(payload.description),
      publish_status: normalizeCategoryStatus(payload.publish_status, "published"),
    });

    return {
      ...(item.toJSON() as Record<string, unknown>),
      usage_count: 0,
      published_count: 0,
    };
  },

  async updateCategory(id: string, payload: Record<string, unknown>) {
    const item = await BlogCategoryModel.findById(id);
    if (!item) {
      throw new AppError(StatusCodes.NOT_FOUND, "Category not found");
    }

    const previousTitle = item.title;
    const previousSlug = item.slug;
    const nextTitle = normalizeText(payload.title) || item.title;
    const nextSlug = slugify(normalizeText(payload.slug) || nextTitle || item.slug);

    if (!nextTitle || !nextSlug) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Category title is required");
    }

    const conflictingCategory = await BlogCategoryModel.findOne({ slug: nextSlug });
    if (conflictingCategory && String(conflictingCategory.id) !== id) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Category slug already exists");
    }

    item.title = nextTitle;
    item.slug = nextSlug;
    item.description =
      typeof payload.description === "undefined"
        ? item.description
        : normalizeText(payload.description);
    item.publish_status = normalizeCategoryStatus(payload.publish_status, item.publish_status);
    await item.save();

    if (previousSlug !== nextSlug || previousTitle !== nextTitle) {
      await BlogModel.updateMany(
        {
          $or: [
            { category_slug: previousSlug },
            { category: previousTitle },
          ],
        },
        {
          $set: {
            category: nextTitle,
            category_slug: nextSlug,
          },
        },
      );
    }

    const usageMap = await buildCategoryUsageMap();
    const usage = usageMap.get(item.slug);

    return {
      ...(item.toJSON() as Record<string, unknown>),
      usage_count: usage?.usage_count ?? 0,
      published_count: usage?.published_count ?? 0,
    };
  },

  async bulkDeleteCategories(ids: string[]) {
    const categories = await BlogCategoryModel.find({
      _id: { $in: ids },
    });

    const categoryTitles = categories.map((item) => item.title);
    const categorySlugs = categories.map((item) => item.slug);
    const assignedCount = await BlogModel.countDocuments({
      $or: [
        { category_slug: { $in: categorySlugs } },
        { category: { $in: categoryTitles } },
      ],
    });

    if (assignedCount > 0) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Remove blog posts from these categories before deleting them",
      );
    }

    await BlogCategoryModel.deleteMany({ _id: { $in: ids } });
    return true;
  },
};
