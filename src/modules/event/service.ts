import { StatusCodes } from "http-status-codes";
import { AppError } from "../../errors/app-error";
import { EventModel, EventRegistrationModel } from "./model";

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

async function createUniqueSlug(baseTitle: string, currentId?: string): Promise<string> {
  const base = toSlug(baseTitle) || `event-${Date.now()}`;
  let candidate = base;
  let suffix = 1;

  while (true) {
    const existing = await EventModel.findOne({ slug: candidate }).select("_id");

    if (!existing || (currentId && String(existing._id) === currentId)) {
      return candidate;
    }

    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

export const eventService = {
  async listEvents() {
    const items = await EventModel.find().sort({ event_date: 1 });
    return items.map((item) => item.toJSON());
  },

  async listEventRegistrations() {
    const items = await EventRegistrationModel.find().sort({ registered_at: -1 });
    return items.map((item) => item.toJSON());
  },

  async createEvent(payload: Record<string, unknown>) {
    const titleEn =
      typeof payload.title_en === "string" ? payload.title_en : "untitled-event";
    const slug = await createUniqueSlug(titleEn);

    const item = await EventModel.create({
      title_en: payload.title_en,
      title_bn: payload.title_bn,
      slug,
      description_en: payload.description_en,
      description_bn: payload.description_bn,
      banner: payload.banner ?? "",
      event_date: payload.event_date,
      registration_fee: payload.registration_fee,
      max_participants: payload.max_participants,
      registered_count: 0,
      publish_status: payload.publish_status,
    });
    return item.toJSON();
  },

  async updateEvent(id: string, payload: Record<string, unknown>) {
    const updatePayload = { ...payload };
    if (typeof updatePayload.title_en === "string") {
      updatePayload.slug = await createUniqueSlug(updatePayload.title_en, id);
    }

    const item = await EventModel.findByIdAndUpdate(id, updatePayload, {
      new: true,
      runValidators: true,
    });
    if (!item) throw new AppError(StatusCodes.NOT_FOUND, "Event not found");

    if (typeof payload.title_en === "string") {
      await EventRegistrationModel.updateMany(
        { event_id: id },
        { event_title: payload.title_en },
      );
    }

    return item.toJSON();
  },

  async setPublishStatus(id: string, publish_status: "draft" | "published" | "archived") {
    const item = await EventModel.findByIdAndUpdate(
      id,
      { publish_status },
      { new: true },
    );
    if (!item) throw new AppError(StatusCodes.NOT_FOUND, "Event not found");
    return item.toJSON();
  },

  async bulkDelete(ids: string[]) {
    await EventModel.deleteMany({ _id: { $in: ids } });
    await EventRegistrationModel.deleteMany({ event_id: { $in: ids } });
    return true;
  },

  async setRegistrationPaymentStatus(
    id: string,
    payment_status: "pending" | "paid" | "failed",
  ) {
    const item = await EventRegistrationModel.findByIdAndUpdate(
      id,
      { payment_status },
      { new: true },
    );
    if (!item) throw new AppError(StatusCodes.NOT_FOUND, "Registration not found");
    return item.toJSON();
  },
};
