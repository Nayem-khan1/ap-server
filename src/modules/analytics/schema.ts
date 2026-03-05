import { z } from "zod";

export const analyticsRangeSchema = z.enum(["7d", "30d", "90d", "12m"]).default("12m");

export const analyticsQuerySchema = z.object({
  range: analyticsRangeSchema.optional(),
});

export const analyticsValidation = {
  query: { query: analyticsQuerySchema },
};

