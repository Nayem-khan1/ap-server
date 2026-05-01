import { z } from "zod";

export const couponDiscountTypeSchema = z.enum(["percentage", "flat"]);

const couponObjectSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_-]+$/),
  discount_type: couponDiscountTypeSchema,
  discount_value: z.coerce.number().min(1).optional(),
  value: z.coerce.number().min(1).optional(),
  max_redemption: z.coerce.number().int().min(1).optional(),
  usage_limit: z.coerce.number().int().min(1).optional(),
  minimum_purchase_amount: z.coerce.number().min(0).optional(),
  course_ids: z.array(z.string().min(1)).default([]),
  expires_at: z.string().min(1).optional(),
  expiry: z.string().min(1).optional(),
  is_active: z.boolean(),
});

const couponBaseSchema = couponObjectSchema.superRefine((values, ctx) => {
  const discountValue =
    typeof values.discount_value === "number"
      ? values.discount_value
      : typeof values.value === "number"
        ? values.value
        : undefined;

  if (typeof discountValue === "undefined") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["discount_value"],
      message: "discount_value (or value) is required",
    });
  }

  if (values.discount_type === "percentage" && typeof discountValue === "number" && discountValue > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["discount_value"],
      message: "Percentage discount cannot exceed 100",
    });
  }

  if (
    typeof values.max_redemption === "undefined" &&
    typeof values.usage_limit === "undefined"
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["max_redemption"],
      message: "max_redemption (or usage_limit) is required",
    });
  }

  if (
    typeof values.expires_at === "undefined" &&
    typeof values.expiry === "undefined"
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["expires_at"],
      message: "expires_at (or expiry) is required",
    });
  }
});

export const couponFormSchema = couponBaseSchema;

export const couponIdParamSchema = z.object({
  id: z.string().min(1),
});

export const updateCouponSchema = couponObjectSchema.partial();

export const toggleCouponSchema = z.object({
  is_active: z.boolean(),
});

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export const couponValidation = {
  create: { body: couponFormSchema },
  update: { params: couponIdParamSchema, body: updateCouponSchema },
  toggle: { params: couponIdParamSchema, body: toggleCouponSchema },
  bulkDelete: { body: bulkDeleteSchema },
};
