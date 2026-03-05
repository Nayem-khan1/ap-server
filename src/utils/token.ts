import jwt, { JwtPayload } from "jsonwebtoken";
import { env } from "../config/env";

export type UserRole = "super_admin" | "admin" | "instructor" | "student";

export interface TokenPayload {
  userId: string;
  role: UserRole;
  tokenVersion: number;
}

function getExpiresIn(value: string): jwt.SignOptions["expiresIn"] {
  return value as jwt.SignOptions["expiresIn"];
}

export function createAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: getExpiresIn(env.JWT_ACCESS_EXPIRES_IN),
  });
}

export function createRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: getExpiresIn(env.JWT_REFRESH_EXPIRES_IN),
  });
}

export function verifyAccessToken(token: string): TokenPayload & JwtPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload & JwtPayload;
}

export function verifyRefreshToken(token: string): TokenPayload & JwtPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload & JwtPayload;
}
