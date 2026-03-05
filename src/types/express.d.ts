import { UserRole } from "../modules/user/model";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: UserRole;
        tokenVersion: number;
      };
    }
  }
}

export {};
