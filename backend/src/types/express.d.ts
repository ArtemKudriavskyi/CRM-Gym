import type { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      admin?: JwtPayload & {
        adminId: string;
        login: string;
      };
    }
  }
}

export {};
