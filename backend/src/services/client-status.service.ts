import type { Subscription } from "@prisma/client";

export type ClientSubscriptionStatus = "ACTIVE" | "EXPIRING_SOON" | "EXPIRED";

const millisecondsInDay = 24 * 60 * 60 * 1000;

export const getClientStatus = (subscription?: Subscription | null): ClientSubscriptionStatus => {
  if (!subscription) {
    return "EXPIRED";
  }

  const now = new Date();
  const endDate = new Date(subscription.endDate);

  if (!subscription.isActive || endDate <= now) {
    return "EXPIRED";
  }

  const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / millisecondsInDay);
  return daysLeft <= 3 ? "EXPIRING_SOON" : "ACTIVE";
};
