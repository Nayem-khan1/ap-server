import mongoose, { Model, Schema, model } from "mongoose";
import { applyDefaultJsonTransform } from "../../utils/mongoose-transform";

export type BlogPublishStatus = "draft" | "published" | "archived";
export type BlogCategoryPublishStatus = "draft" | "published";
export type BlogContentBlockType = "text" | "heading" | "image";
export type BlogRichTextDocument = Record<string, unknown>;

export interface IBlogContentBlock {
  type: BlogContentBlockType;
  value_en: string;
  value_bn: string;
  url: string;
  caption_en: string;
  caption_bn: string;
  level: number;
  rich_text_en: BlogRichTextDocument | null;
  rich_text_bn: BlogRichTextDocument | null;
  order_no: number;
}

export interface IBlogPost {
  title_en: string;
  title_bn: string;
  content_blocks: IBlogContentBlock[];
  content_en: string;
  content_bn: string;
  excerpt_en: string;
  excerpt_bn: string;
  category: string;
  category_slug: string;
  tags: string[];
  thumbnail: string;
  featured_image: string;
  seo_title: string;
  seo_description: string;
  slug: string;
  author: string;
  publish_status: BlogPublishStatus;
  published_at: Date | null;
  read_time: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBlogCategory {
  title: string;
  slug: string;
  description: string;
  publish_status: BlogCategoryPublishStatus;
  createdAt: Date;
  updatedAt: Date;
}

const blogContentBlockSchema = new Schema<IBlogContentBlock>(
  {
    type: {
      type: String,
      enum: ["text", "heading", "image"],
      required: true,
    },
    value_en: { type: String, default: "" },
    value_bn: { type: String, default: "" },
    url: { type: String, default: "" },
    caption_en: { type: String, default: "" },
    caption_bn: { type: String, default: "" },
    level: { type: Number, default: 2 },
    rich_text_en: { type: Schema.Types.Mixed, default: null },
    rich_text_bn: { type: Schema.Types.Mixed, default: null },
    order_no: { type: Number, required: true },
  },
  { _id: false },
);

const blogSchema = new Schema<IBlogPost>(
  {
    title_en: { type: String, required: true },
    title_bn: { type: String, required: true },
    content_blocks: { type: [blogContentBlockSchema], default: [] },
    content_en: { type: String, required: true },
    content_bn: { type: String, required: true },
    excerpt_en: { type: String, default: "" },
    excerpt_bn: { type: String, default: "" },
    category: { type: String, required: true },
    category_slug: { type: String, required: true, index: true },
    tags: { type: [String], default: [] },
    thumbnail: { type: String, default: "" },
    featured_image: { type: String, default: "" },
    seo_title: { type: String, required: true },
    seo_description: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    author: { type: String, required: true },
    publish_status: {
      type: String,
      enum: ["draft", "published", "archived"],
      required: true,
      index: true,
    },
    published_at: { type: Date, default: null },
    read_time: { type: String, default: "1 min read" },
  },
  { timestamps: true },
);

const blogCategorySchema = new Schema<IBlogCategory>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, default: "" },
    publish_status: {
      type: String,
      enum: ["draft", "published"],
      required: true,
      default: "published",
      index: true,
    },
  },
  { timestamps: true },
);

applyDefaultJsonTransform(blogSchema);
applyDefaultJsonTransform(blogCategorySchema);

type BlogModel = Model<IBlogPost>;
type BlogCategoryModel = Model<IBlogCategory>;

export const BlogModel =
  (mongoose.models.BlogPost as BlogModel | undefined) ||
  model<IBlogPost>("BlogPost", blogSchema);

export const BlogCategoryModel =
  (mongoose.models.BlogCategory as BlogCategoryModel | undefined) ||
  model<IBlogCategory>("BlogCategory", blogCategorySchema);
