import type { Prisma } from "@prisma/client";
import type { RequestHandler } from "express";
import { z } from "zod";
import { HttpError } from "../middlewares/error.middleware.js";
import { getClientStatus } from "../services/client-status.service.js";
import { prisma } from "../services/prisma.service.js";

const createClientSchema = z.object({
  fullName: z.string().min(2).max(120),
  phone: z.string().min(5).max(30),
  birthDate: z.coerce.date(),
  photoUrl: z.string().min(1).optional().nullable()
});

const updateClientSchema = createClientSchema.partial();
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const startOfNextDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

type ClientWithLatestSubscription = Prisma.ClientGetPayload<{
  include: {
    subscriptions: true;
    visits: true;
  };
}>;

const mapClient = (client: ClientWithLatestSubscription) => {
  const latestSubscription = client.subscriptions[0] ?? null;
  const todayVisitsCount = client.visits.length;
  const lastVisitToday = client.visits[0] ?? null;

  return {
    ...client,
    latestSubscription,
    subscriptionStatus: getClientStatus(latestSubscription),
    canRegisterVisit: getClientStatus(latestSubscription) !== "EXPIRED",
    todayVisitsCount,
    lastVisitToday,
    hasVisitedToday: todayVisitsCount > 0
  };
};

export const getClients: RequestHandler = async (_req, res, next) => {
  try {
    const now = new Date();
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        subscriptions: {
          orderBy: { endDate: "desc" },
          take: 1
        },
        visits: {
          where: {
            visitTimestamp: {
              gte: startOfDay(now),
              lt: startOfNextDay(now)
            }
          },
          orderBy: { visitTimestamp: "desc" }
        }
      }
    });

    res.json(clients.map(mapClient));
  } catch (error) {
    next(error);
  }
};

export const getClientById: RequestHandler = async (req, res, next) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.clientId },
      include: {
        subscriptions: {
          orderBy: { startDate: "desc" }
        },
        visits: {
          orderBy: { visitTimestamp: "desc" }
        },
        payments: {
          orderBy: { paymentTimestamp: "desc" },
          include: {
            subscription: true
          }
        }
      }
    });

    if (!client) {
      throw new HttpError(404, "Клієнта не знайдено");
    }

    const latestSubscription = [...client.subscriptions].sort(
      (first, second) => second.endDate.getTime() - first.endDate.getTime()
    )[0] ?? null;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const totalPaid = client.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const visitsThisMonth = client.visits.filter(
      (visit) => visit.visitTimestamp >= monthStart
    ).length;
    const todayVisitsCount = client.visits.filter(
      (visit) => visit.visitTimestamp >= startOfDay(now) && visit.visitTimestamp < startOfNextDay(now)
    ).length;
    const lastVisitToday = client.visits.find(
      (visit) => visit.visitTimestamp >= startOfDay(now) && visit.visitTimestamp < startOfNextDay(now)
    ) ?? null;

    res.json({
      ...client,
      latestSubscription,
      subscriptionStatus: getClientStatus(latestSubscription),
      canRegisterVisit: getClientStatus(latestSubscription) !== "EXPIRED",
      todayVisitsCount,
      lastVisitToday,
      hasVisitedToday: todayVisitsCount > 0,
      stats: {
        totalVisits: client.visits.length,
        visitsThisMonth,
        todayVisitsCount,
        totalPaid,
        daysLeft: latestSubscription
          ? Math.max(
              0,
              Math.ceil((latestSubscription.endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
            )
          : 0
      }
    });
  } catch (error) {
    next(error);
  }
};

export const createClient: RequestHandler = async (req, res, next) => {
  try {
    const dto = createClientSchema.parse(req.body);
    const client = await prisma.client.create({
      data: dto
    });

    res.status(201).json(client);
  } catch (error) {
    next(error);
  }
};

export const updateClient: RequestHandler = async (req, res, next) => {
  try {
    const dto = updateClientSchema.parse(req.body);
    const client = await prisma.client.update({
      where: { id: req.params.clientId },
      data: dto
    });

    res.json(client);
  } catch (error) {
    next(error);
  }
};

export const deleteClient: RequestHandler = async (req, res, next) => {
  try {
    await prisma.client.delete({
      where: { id: req.params.clientId }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const registerVisit: RequestHandler = async (req, res, next) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.clientId },
      include: {
        subscriptions: {
          orderBy: { endDate: "desc" },
          take: 1
        }
      }
    });

    if (!client) {
      throw new HttpError(404, "Клієнта не знайдено");
    }

    const status = getClientStatus(client.subscriptions[0]);
    if (status === "EXPIRED") {
      throw new HttpError(403, "Абонемент відсутній або закінчився");
    }

    const visit = await prisma.visit.create({
      data: { clientId: client.id }
    });

    res.status(201).json(visit);
  } catch (error) {
    next(error);
  }
};

export const deleteVisit: RequestHandler = async (req, res, next) => {
  try {
    const visit = await prisma.visit.findFirst({
      where: {
        id: req.params.visitId,
        clientId: req.params.clientId
      }
    });

    if (!visit) {
      throw new HttpError(404, "Візит не знайдено");
    }

    await prisma.visit.delete({
      where: { id: visit.id }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
