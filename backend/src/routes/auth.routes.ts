import { Router } from "express";
import { changePassword, login } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

export const authRouter = Router();

authRouter.post("/login", login);
authRouter.patch("/password", authMiddleware, changePassword);
