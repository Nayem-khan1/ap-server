import { z } from "zod";

const emailSchema = z.string().trim().email();

const studentLoginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(6),
});

const adminLoginBodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const forgotPasswordBodySchema = z.object({
  email: emailSchema,
});

const verifyOtpBodySchema = z.object({
  email: emailSchema,
  otp: z.string().regex(/^\d{6}$/, "OTP must be a 6 digit number"),
});

const resetPasswordBodySchema = z.object({
  email: emailSchema,
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  reset_token: z.string().min(16).optional(),
});

export const authValidation = {
  studentLogin: {
    body: studentLoginBodySchema,
  },
  adminLogin: {
    body: adminLoginBodySchema,
  },
  forgotPassword: {
    body: forgotPasswordBodySchema,
  },
  verifyOtp: {
    body: verifyOtpBodySchema,
  },
  resetPassword: {
    body: resetPasswordBodySchema,
  },
};

export type StudentLoginBody = z.infer<typeof studentLoginBodySchema>;
export type AdminLoginBody = z.infer<typeof adminLoginBodySchema>;
export type ForgotPasswordBody = z.infer<typeof forgotPasswordBodySchema>;
export type VerifyOtpBody = z.infer<typeof verifyOtpBodySchema>;
export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>;
