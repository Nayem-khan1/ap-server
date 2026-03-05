import mongoose, { Model, Schema, model } from "mongoose";
import { applyDefaultJsonTransform } from "../../utils/mongoose-transform";

interface IPlatformSocialLink {
  id: string;
  platform: string;
  url: string;
}

export interface ISettings {
  key: string;
  platform: {
    logo_url: string;
    favicon_url: string;
    contact_email: string;
    contact_phone: string;
    contact_address: string;
    social_links: IPlatformSocialLink[];
  };
  seo: {
    meta_title: string;
    meta_description: string;
    og_image_url: string;
    canonical_url: string;
    robots_index: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const socialLinkSchema = new Schema<IPlatformSocialLink>(
  {
    id: { type: String, required: true },
    platform: { type: String, required: true },
    url: { type: String, required: true },
  },
  { _id: false },
);

const settingsSchema = new Schema<ISettings>(
  {
    key: { type: String, required: true, unique: true, default: "app" },
    platform: {
      logo_url: { type: String, default: "" },
      favicon_url: { type: String, default: "" },
      contact_email: { type: String, default: "" },
      contact_phone: { type: String, default: "" },
      contact_address: { type: String, default: "" },
      social_links: { type: [socialLinkSchema], default: [] },
    },
    seo: {
      meta_title: { type: String, default: "" },
      meta_description: { type: String, default: "" },
      og_image_url: { type: String, default: "" },
      canonical_url: { type: String, default: "" },
      robots_index: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

applyDefaultJsonTransform(settingsSchema);

type SettingsModel = Model<ISettings>;

export const SettingsModel =
  (mongoose.models.Settings as SettingsModel | undefined) ||
  model<ISettings>("Settings", settingsSchema);

