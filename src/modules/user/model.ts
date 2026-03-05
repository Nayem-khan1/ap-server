import bcrypt from "../../utils/bcrypt";
import mongoose, { Model, Schema, model } from "mongoose";
import { env } from "../../config/env";
import { applyDefaultJsonTransform } from "../../utils/mongoose-transform";

export type UserRole = "super_admin" | "admin" | "instructor" | "student";
export type UserStatus = "active" | "inactive";
export type PublishStatus = "draft" | "published" | "archived";

export interface IUser {
  name: string;
  email: string;
  username: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  phone: string;
  enrolled_courses_count: number;
  bio: string;
  avatar: string;
  specialization: string;
  publish_status: PublishStatus;
  isVerified: boolean;
  otpCode: string | null;
  otpExpiresAt: Date | null;
  resetToken: string | null;
  resetTokenExpiresAt: Date | null;
  refreshTokenHash: string | null;
  refreshTokenExpiresAt: Date | null;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

type UserModel = Model<IUser>;

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["super_admin", "admin", "instructor", "student"],
      required: true,
      index: true,
    },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
    phone: { type: String, default: "" },
    enrolled_courses_count: { type: Number, default: 0, min: 0 },
    bio: { type: String, default: "" },
    avatar: { type: String, default: "" },
    specialization: { type: String, default: "" },
    publish_status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    isVerified: { type: Boolean, default: false },
    otpCode: { type: String, default: null, select: false },
    otpExpiresAt: { type: Date, default: null, select: false },
    resetToken: { type: String, default: null, select: false },
    resetTokenExpiresAt: { type: Date, default: null, select: false },
    refreshTokenHash: { type: String, default: null, select: false },
    refreshTokenExpiresAt: { type: Date, default: null, select: false },
    tokenVersion: { type: Number, default: 0, select: false },
  },
  { timestamps: true },
);

userSchema.index({ role: 1, status: 1 });

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) {
    next();
    return;
  }

  this.password = await bcrypt.hash(this.password, env.BCRYPT_SALT_ROUNDS);
  next();
});

applyDefaultJsonTransform(userSchema);

export const UserModel =
  (mongoose.models.User as UserModel | undefined) ||
  model<IUser>("User", userSchema);
