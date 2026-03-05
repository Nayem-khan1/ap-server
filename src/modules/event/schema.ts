import { z } from "zod";

export const eventFormSchema = z.object({
  title_en: z.string().min(2),
  title_bn: z.string().min(2),
  description_en: z.string().min(20),
  description_bn: z.string().min(20),
  banner: z.string().url().or(z.literal("")),
  event_date: z.string().min(1),
  registration_fee: z.coerce.number().min(0),
  max_participants: z.coerce.number().int().min(1),
  publish_status: z.enum(["draft", "published", "archived"]),
});

export const eventIdParamSchema = z.object({
  id: z.string().min(1),
});

export const updateEventSchema = eventFormSchema.partial();

export const updateEventStatusSchema = z.object({
  publish_status: z.enum(["draft", "published", "archived"]),
});

export const updateRegistrationPaymentStatusSchema = z.object({
  payment_status: z.enum(["pending", "paid", "failed"]),
});

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export const eventValidation = {
  create: { body: eventFormSchema },
  update: { params: eventIdParamSchema, body: updateEventSchema },
  updateStatus: { params: eventIdParamSchema, body: updateEventStatusSchema },
  updateRegistrationStatus: {
    params: eventIdParamSchema,
    body: updateRegistrationPaymentStatusSchema,
  },
  bulkDelete: { body: bulkDeleteSchema },
};

