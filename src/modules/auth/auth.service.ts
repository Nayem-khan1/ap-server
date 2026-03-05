import bcrypt from "../../utils/bcrypt";
import crypto from "crypto";
import { StatusCodes } from "http-status-codes";
import { env } from "../../config/env";
import { AppError } from "../../errors/app-error";
import { parseDurationToMs } from "../../utils/duration";
import { sendOtpEmail } from "../../utils/email.service";
import { sha256 } from "../../utils/hash";
import { createAccessToken, createRefreshToken } from "../../utils/token";
import { logger } from "../../config/logger";
import {
  AdminLoginBody,
  ForgotPasswordBody,
  ResetPasswordBody,
  StudentLoginBody,
  VerifyOtpBody,
} from "./auth.validation";
import { UserModel } from "../user/model";

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface VerifyOtpResponse {
  reset_token: string;
  expires_in_minutes: number;
}

const refreshTokenMaxAgeMs = parseDurationToMs(
  env.JWT_REFRESH_EXPIRES_IN,
  7 * 24 * 60 * 60 * 1000,
);

function generateSixDigitOtp(): string {
  const otp = Math.floor(100000 + Math.random() * 900000);
  return String(otp);
}

function resolveUserId(user: { id?: string | null; _id?: unknown }): string {
  if (typeof user.id === "string" && user.id.trim()) {
    return user.id;
  }

  if (typeof user._id !== "undefined" && user._id !== null) {
    return String(user._id);
  }

  throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Unable to resolve user id");
}

function toAuthUser(user: {
  id?: string | null;
  _id?: unknown;
  name: string;
  email: string;
  role: string;
}) {
  const resolvedId = resolveUserId(user);

  return {
    id: resolvedId,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

async function issueTokensForUser(
  user: {
    id?: string | null;
    _id?: unknown;
    role: "super_admin" | "admin" | "instructor" | "student";
    tokenVersion: number;
    refreshTokenHash: string | null;
    refreshTokenExpiresAt: Date | null;
    save: () => Promise<unknown>;
  },
) {
  const resolvedId = resolveUserId(user);
  const tokenPayload = {
    userId: resolvedId,
    role: user.role,
    tokenVersion: user.tokenVersion,
  };

  const access_token = createAccessToken(tokenPayload);
  const refresh_token = createRefreshToken(tokenPayload);

  user.refreshTokenHash = sha256(refresh_token);
  user.refreshTokenExpiresAt = new Date(Date.now() + refreshTokenMaxAgeMs);
  await user.save();

  return { access_token, refresh_token };
}

export const authService = {
  async loginStudent(payload: StudentLoginBody): Promise<LoginResponse> {
    const user = await UserModel.findOne({
      email: payload.email.toLowerCase(),
      role: "student",
      status: "active",
    }).select("+password +tokenVersion +refreshTokenHash +refreshTokenExpiresAt");

    const unauthorizedError = new AppError(
      StatusCodes.UNAUTHORIZED,
      "Invalid email or password",
    );

    if (!user) {
      throw unauthorizedError;
    }

    const isPasswordMatch = await bcrypt.compare(payload.password, user.password);

    if (!isPasswordMatch) {
      throw unauthorizedError;
    }

    const { access_token, refresh_token } = await issueTokensForUser(user);

    return {
      access_token,
      refresh_token,
      token: access_token,
      user: toAuthUser(user),
    };
  },

  async loginAdmin(payload: AdminLoginBody): Promise<LoginResponse> {
    const normalizedUsername = payload.username.toLowerCase();
    const user = await UserModel.findOne({
      $or: [{ username: normalizedUsername }, { email: normalizedUsername }],
      role: { $in: ["super_admin", "admin", "instructor"] },
      status: "active",
    }).select("+password +tokenVersion +refreshTokenHash +refreshTokenExpiresAt");

    const unauthorizedError = new AppError(
      StatusCodes.UNAUTHORIZED,
      "Invalid credentials",
    );

    if (!user) {
      throw unauthorizedError;
    }

    const isPasswordMatch = await bcrypt.compare(payload.password, user.password);
    if (!isPasswordMatch) {
      throw unauthorizedError;
    }

    const { access_token, refresh_token } = await issueTokensForUser(user);

    return {
      access_token,
      refresh_token,
      token: access_token,
      user: toAuthUser(user),
    };
  },

  async forgotPassword(payload: ForgotPasswordBody): Promise<void> {
    const user = await UserModel.findOne({
      email: payload.email.toLowerCase(),
    }).select("+otpCode +otpExpiresAt");

    if (!user) {
      return;
    }

    const otp = generateSixDigitOtp();
    const otpHash = await bcrypt.hash(otp, env.BCRYPT_SALT_ROUNDS);

    user.otpCode = otpHash;
    user.otpExpiresAt = new Date(
      Date.now() + env.OTP_EXPIRES_MINUTES * 60 * 1000,
    );
    await user.save();

    try {
      await sendOtpEmail(user.email, otp);
    } catch (error) {
      logger.error("Failed to send OTP email", error as Error);
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to send OTP email",
      );
    }
  },

  async verifyOtp(payload: VerifyOtpBody): Promise<VerifyOtpResponse> {
    const user = await UserModel.findOne({
      email: payload.email.toLowerCase(),
    }).select("+otpCode +otpExpiresAt +resetToken +resetTokenExpiresAt");

    if (!user?.otpCode || !user.otpExpiresAt) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid or expired OTP");
    }

    const isExpired = user.otpExpiresAt.getTime() < Date.now();
    if (isExpired) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid or expired OTP");
    }

    const isOtpMatch = await bcrypt.compare(payload.otp, user.otpCode);
    if (!isOtpMatch) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid or expired OTP");
    }

    const resetTokenPlain = crypto.randomBytes(32).toString("hex");

    user.isVerified = true;
    user.otpCode = null;
    user.otpExpiresAt = null;
    user.resetToken = sha256(resetTokenPlain);
    user.resetTokenExpiresAt = new Date(
      Date.now() + env.RESET_TOKEN_EXPIRES_MINUTES * 60 * 1000,
    );
    await user.save();

    return {
      reset_token: resetTokenPlain,
      expires_in_minutes: env.RESET_TOKEN_EXPIRES_MINUTES,
    };
  },

  async resetPassword(payload: ResetPasswordBody, resetToken: string): Promise<void> {
    const user = await UserModel.findOne({
      email: payload.email.toLowerCase(),
    }).select(
      "+password +resetToken +resetTokenExpiresAt +otpCode +otpExpiresAt +tokenVersion +refreshTokenHash +refreshTokenExpiresAt",
    );

    if (!user?.resetToken || !user.resetTokenExpiresAt) {
      throw new AppError(StatusCodes.UNAUTHORIZED, "Invalid or expired reset token");
    }

    const tokenHash = sha256(resetToken);
    if (tokenHash !== user.resetToken) {
      throw new AppError(StatusCodes.UNAUTHORIZED, "Invalid or expired reset token");
    }

    const isExpired = user.resetTokenExpiresAt.getTime() < Date.now();
    if (isExpired) {
      throw new AppError(StatusCodes.UNAUTHORIZED, "Invalid or expired reset token");
    }

    user.password = payload.newPassword;
    user.otpCode = null;
    user.otpExpiresAt = null;
    user.resetToken = null;
    user.resetTokenExpiresAt = null;
    user.refreshTokenHash = null;
    user.refreshTokenExpiresAt = null;
    user.tokenVersion += 1;

    await user.save();
  },

  async getProfile(userId: string) {
    const user = await UserModel.findById(userId).select("name email role status");

    if (!user) {
      throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    }

    return user.toJSON();
  },
};
