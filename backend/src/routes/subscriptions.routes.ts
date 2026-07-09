import { Router } from "express";
import { getSubscriptionPlans } from "../controllers/subscriptions.controller.js";

export const subscriptionsRouter = Router();

subscriptionsRouter.get("/plans", getSubscriptionPlans);
