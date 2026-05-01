import { z } from "zod";

export const paymentStatusSchema = z.enum(["pending", "verified", "failed"]);

export const paymentIdParamSchema = z.object({
  id: z.string().min(1),
});

export const verifyPaymentSchema = z.object({
  verifierName: z.string().min(2),
});

export const updatePaymentStatusSchema = z.object({
  status: paymentStatusSchema,
  verifierName: z.string().optional(),
});

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export const bkashInitSchema = z.object({
  student_id: z.string().min(1),
  course_id: z.string().min(1),
  amount: z.coerce.number().min(0).optional(),
  coupon_code: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
});

export const bkashCallbackBodySchema = z.object({
  paymentID: z.string().optional(),
  status: z.string().optional(),
  invoice: z.string().optional(),
});

export const bkashCallbackQuerySchema = z.object({
  paymentID: z.string().optional(),
  status: z.string().optional(),
  invoice: z.string().optional(),
});

export const bkashExecuteSchema = z
  .object({
    payment_id: z.string().optional(),
    paymentID: z.string().optional(),
    invoice: z.string().optional(),
  })
  .refine(
    (value) =>
      Boolean(
        (value.payment_id && value.payment_id.trim()) ||
          (value.paymentID && value.paymentID.trim()) ||
          (value.invoice && value.invoice.trim()),
      ),
    {
      message: "Provide payment_id, paymentID, or invoice",
      path: ["payment_id"],
    },
  );

export const bkashRefundSchema = z
  .object({
    payment_id: z.string().optional(),
    paymentID: z.string().optional(),
    invoice: z.string().optional(),
    trxID: z.string().min(1).optional(),
    amount: z.coerce.number().positive(),
    reason: z.string().min(3),
    sku: z.string().min(1).optional(),
  })
  .refine(
    (value) =>
      Boolean(
        (value.payment_id && value.payment_id.trim()) ||
          (value.paymentID && value.paymentID.trim()) ||
          (value.invoice && value.invoice.trim()),
      ),
    {
      message: "Provide payment_id, paymentID, or invoice",
      path: ["payment_id"],
    },
  );

export const paymentValidation = {
  paymentId: { params: paymentIdParamSchema },
  verify: { params: paymentIdParamSchema, body: verifyPaymentSchema },
  updateStatus: { params: paymentIdParamSchema, body: updatePaymentStatusSchema },
  bulkDelete: { body: bulkDeleteSchema },
  bkashInit: { body: bkashInitSchema },
  bkashCreate: { body: bkashInitSchema },
  bkashCallback: { query: bkashCallbackQuerySchema },
  bkashCallbackBody: { body: bkashCallbackBodySchema },
  bkashExecute: { body: bkashExecuteSchema },
  bkashRefund: { body: bkashRefundSchema },
};
