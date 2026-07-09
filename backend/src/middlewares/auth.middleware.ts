import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { HttpError } from "./error.middleware.js";

export const authMiddleware: RequestHandler = (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    next(new HttpError(401, "Потрібна авторизація"));
    return;
  }

  try {
    const token = authHeader.slice("Bearer ".length);
    req.admin = jwt.verify(token, env.JWT_SECRET) as Express.Request["admin"];
    next();
  } catch {
    next(new HttpError(401, "Недійсний або прострочений токен"));
  }
};
