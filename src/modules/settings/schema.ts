import { z } from "zod";

const urlOrEmpty = z.string().url().or(z.literal(""));

export const platformSocialLinkSchema = z.object({
  id: z.string().min(1),
  platform: z.string().min(2),
  url: z.string().url(),
});

export const platformSettingsFormSchema = z.object({
  logo_url: urlOrEmpty,
  favicon_url: urlOrEmpty,
  contact_email: z.string().email(),
  contact_phone: z.string().min(6),
  contact_address: z.string().min(5),
  social_links: z.array(platformSocialLinkSchema).default([]),
});

export const seoSettingsFormSchema = z.object({
  meta_title: z.string().min(10),
  meta_description: z.string().min(20),
  og_image_url: urlOrEmpty,
  canonical_url: urlOrEmpty,
  robots_index: z.boolean(),
});

export const settingsValidation = {
  updatePlatform: { body: platformSettingsFormSchema },
  updateSeo: { body: seoSettingsFormSchema },
};

