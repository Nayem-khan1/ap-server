import mongoose, { Model, Schema, model } from "mongoose";
import { applyDefaultJsonTransform } from "../../utils/mongoose-transform";

export interface IBlogPost {
  title_en: string;
  title_bn: string;
  content_en: string;
  content_bn: string;
  category: string;
  tags: string[];
  featured_image: string;
  seo_title: string;
  seo_description: string;
  slug: string;
  author: string;
  publish_status: "draft" | "published" | "archived";
  createdAt: Date;
  updatedAt: Date;
}

const blogSchema = new Schema<IBlogPost>(
  {
    title_en: { type: String, required: true },
    title_bn: { type: String, required: true },
    content_en: { type: String, required: true },
    content_bn: { type: String, required: true },
    category: { type: String, required: true },
    tags: { type: [String], default: [] },
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
  },
  { timestamps: true },
);

applyDefaultJsonTransform(blogSchema);

type BlogModel = Model<IBlogPost>;

export const BlogModel =
  (mongoose.models.BlogPost as BlogModel | undefined) ||
  model<IBlogPost>("BlogPost", blogSchema);

