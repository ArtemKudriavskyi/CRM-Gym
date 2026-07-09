import { SubscriptionType } from "@prisma/client";

export const subscriptionPlans: Record<
  SubscriptionType,
  {
    label: string;
    durationDays: number;
    price: number;
  }
> = {
  MONTH: {
    label: "1 місяць",
    durationDays: 30,
    price: 1200
  },
  THREE_MONTHS: {
    label: "3 місяці",
    durationDays: 90,
    price: 3200
  },
  STUDENT: {
    label: "Студентський",
    durationDays: 30,
    price: 850
  }
};

export const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};
