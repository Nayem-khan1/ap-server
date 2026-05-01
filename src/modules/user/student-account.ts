import { StatusCodes } from "http-status-codes";
import { AppError } from "../../errors/app-error";
import { UserModel, UserStatus } from "./model";

function sanitizeUsername(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildUsernameSeed(name: string, email: string): string {
  const nameSeed = sanitizeUsername(name);
  if (nameSeed.length >= 3) {
    return nameSeed.slice(0, 16);
  }

  const emailSeed = sanitizeUsername(email.split("@")[0] ?? "");
  if (emailSeed.length >= 3) {
    return emailSeed.slice(0, 16);
  }

  return "student";
}

async function resolveUniqueUsername(seed: string): Promise<string> {
  const normalizedSeed = (seed.trim() || "student").slice(0, 16);
  let suffix = 0;

  while (suffix < 1000) {
    const suffixPart = suffix === 0 ? "" : String(suffix);
    const baseLength = Math.max(3, 16 - suffixPart.length);
    const candidate = `${normalizedSeed.slice(0, baseLength)}${suffixPart}`;
    const existing = await UserModel.exists({ username: candidate });
    if (!existing) {
      return candidate;
    }
    suffix += 1;
  }

  throw new AppError(
    StatusCodes.INTERNAL_SERVER_ERROR,
    "Unable to generate username",
  );
}

export interface CreateStudentAccountInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  username?: string;
  status?: UserStatus;
}

export async function createStudentAccount(
  payload: CreateStudentAccountInput,
) {
  const normalizedEmail = payload.email.toLowerCase().trim();

  const existingEmail = await UserModel.exists({ email: normalizedEmail });
  if (existingEmail) {
    throw new AppError(StatusCodes.CONFLICT, "Email already registered");
  }

  let username = payload.username?.trim().toLowerCase() ?? "";
  if (!username) {
    username = await resolveUniqueUsername(
      buildUsernameSeed(payload.name, normalizedEmail),
    );
  } else {
    const existingUsername = await UserModel.exists({ username });
    if (existingUsername) {
      throw new AppError(StatusCodes.CONFLICT, "Username already registered");
    }
  }

  const user = await UserModel.create({
    name: payload.name.trim(),
    email: normalizedEmail,
    username,
    password: payload.password,
    role: "student",
    status: payload.status ?? "active",
    phone: payload.phone?.trim() ?? "",
    enrolled_courses_count: 0,
    publish_status: "published",
    isVerified: true,
  });

  return user;
}
