import { SubscriptionType } from "@prisma/client";
import type { RequestHandler } from "express";
import { z } from "zod";
import { HttpError } from "../middlewares/error.middleware.js";
import { prisma } from "../services/prisma.service.js";
import { addDays, subscriptionPlans } from "../services/subscription-plans.service.js";

const activateSubscriptionSchema = z.object({
  type: z.nativeEnum(SubscriptionType),
  price: z.number().int().positive().optional()
});

export const getSubscriptionPlans: RequestHandler = (_req, res) => {
  res.json(subscriptionPlans);
};

export const activateSubscription: RequestHandler = async (req, res, next) => {
  try {
    const dto = activateSubscriptionSchema.parse(req.body);
    const plan = subscriptionPlans[dto.type];
    const clientId = req.params.clientId;
    const startDate = new Date();
    const endDate = addDays(startDate, plan.durationDays);
    const price = dto.price ?? plan.price;

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      throw new HttpError(404, "Клієнта не знайдено");
    }

    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        clientId,
        isActive: true,
        endDate: {
          gt: startDate
        }
      },
      orderBy: {
        endDate: "desc"
      }
    });

    if (activeSubscription) {
      throw new HttpError(
        409,
        `У клієнта вже є активний абонемент до ${activeSubscription.endDate.toLocaleDateString("uk-UA")}`
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.subscription.updateMany({
        where: {
          clientId,
          isActive: true
        },
        data: {
          isActive: false
        }
      });

      const subscription = await tx.subscription.create({
        data: {
          clientId,
          type: dto.type,
          startDate,
          endDate,
          price,
          isActive: true
        }
      });

      const payment = await tx.payment.create({
        data: {
          clientId,
          subscriptionId: subscription.id,
          amount: price
        }
      });

      return { subscription, payment };
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};
