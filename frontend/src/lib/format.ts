import type { SubscriptionStatus, SubscriptionType } from "../types/api";

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: "UAH",
    maximumFractionDigits: 0
  }).format(amount);

export const formatDate = (date: string) =>
  new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(date));

export const formatDateTime = (date: string) =>
  new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));

export const subscriptionTypeLabels: Record<SubscriptionType, string> = {
  MONTH: "1 місяць",
  THREE_MONTHS: "3 місяці",
  STUDENT: "Студентський"
};

export const statusCopy: Record<
  SubscriptionStatus,
  {
    label: string;
    dotClass: string;
    rowClass: string;
  }
> = {
  ACTIVE: {
    label: "Активний",
    dotClass: "bg-emerald-500",
    rowClass: "border-l-emerald-500"
  },
  EXPIRING_SOON: {
    label: "Закінчується",
    dotClass: "bg-amber-400",
    rowClass: "border-l-amber-400"
  },
  EXPIRED: {
    label: "Немає доступу",
    dotClass: "bg-rose-500",
    rowClass: "border-l-rose-500"
  }
};
