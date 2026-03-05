import { SettingsModel } from "./model";

const DEFAULT_SETTINGS = {
  key: "app",
  platform: {
    logo_url: "",
    favicon_url: "",
    contact_email: "support@astronomypathshala.com",
    contact_phone: "",
    contact_address: "",
    social_links: [],
  },
  seo: {
    meta_title: "Astronomy Pathshala",
    meta_description: "LMS platform",
    og_image_url: "",
    canonical_url: "",
    robots_index: true,
  },
};

async function ensureSettings() {
  let settings = await SettingsModel.findOne({ key: "app" });
  if (!settings) {
    settings = await SettingsModel.create(DEFAULT_SETTINGS);
  }
  return settings;
}

export const settingsService = {
  async getSettings() {
    const settings = await ensureSettings();
    return settings.toJSON();
  },

  async getPlatform() {
    const settings = await ensureSettings();
    return settings.toJSON().platform;
  },

  async updatePlatform(payload: Record<string, unknown>) {
    const settings = await ensureSettings();
    settings.platform = {
      ...settings.platform,
      ...payload,
      social_links: Array.isArray(payload.social_links)
        ? (payload.social_links as never[])
        : settings.platform.social_links,
    };
    await settings.save();
    return settings.toJSON().platform;
  },

  async getSeo() {
    const settings = await ensureSettings();
    return settings.toJSON().seo;
  },

  async updateSeo(payload: Record<string, unknown>) {
    const settings = await ensureSettings();
    settings.seo = {
      ...settings.seo,
      ...payload,
    };
    await settings.save();
    return settings.toJSON().seo;
  },
};

