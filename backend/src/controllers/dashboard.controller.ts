import type { RequestHandler } from "express";
import { prisma } from "../services/prisma.service.js";

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const startOfNextDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const startOfNextMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 1);

export const getDashboardStats: RequestHandler = async (_req, res, next) => {
  try {
    const now = new Date();

    const [
      today,
      month,
      activeSubscriptions,
      expiringSubscriptions,
      todayVisits,
      recentPayments,
      recentVisits,
      todayVisitLog
    ] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          paymentTimestamp: {
            gte: startOfDay(now),
            lt: startOfNextDay(now)
          }
        },
        _sum: { amount: true }
      }),
      prisma.payment.aggregate({
        where: {
          paymentTimestamp: {
            gte: startOfMonth(now),
            lt: startOfNextMonth(now)
          }
        },
        _sum: { amount: true }
      }),
      prisma.subscription.count({
        where: {
          isActive: true,
          endDate: { gt: now }
        }
      }),
      prisma.subscription.count({
        where: {
          isActive: true,
          endDate: {
            gt: now,
            lte: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      prisma.visit.count({
        where: {
          visitTimestamp: {
            gte: startOfDay(now),
            lt: startOfNextDay(now)
          }
        }
      }),
      prisma.payment.findMany({
        orderBy: { paymentTimestamp: "desc" },
        take: 5,
        include: {
          client: true,
          subscription: true
        }
      }),
      prisma.visit.findMany({
        orderBy: { visitTimestamp: "desc" },
        take: 5,
        include: {
          client: true
        }
      }),
      prisma.visit.findMany({
        where: {
          visitTimestamp: {
            gte: startOfDay(now),
            lt: startOfNextDay(now)
          }
        },
        orderBy: { visitTimestamp: "desc" },
        include: {
          client: true
        }
      })
    ]);

    res.json({
      todayCash: today._sum.amount ?? 0,
      monthRevenue: month._sum.amount ?? 0,
      activeClients: activeSubscriptions,
      expiringClients: expiringSubscriptions,
      todayVisits,
      recentPayments,
      recentVisits,
      todayVisitLog
    });
  } catch (error) {
    next(error);
  }
};
