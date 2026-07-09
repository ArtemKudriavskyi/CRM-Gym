import { Router } from "express";
import { getDashboardStats } from "../controllers/dashboard.controller.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", getDashboardStats);
