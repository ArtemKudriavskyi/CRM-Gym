export type SubscriptionType = "MONTH" | "THREE_MONTHS" | "STUDENT";

export type SubscriptionStatus = "ACTIVE" | "EXPIRING_SOON" | "EXPIRED";

export type Subscription = {
  id: string;
  clientId: string;
  type: SubscriptionType;
  startDate: string;
  endDate: string;
  price: number;
  isActive: boolean;
};

export type Visit = {
  id: string;
  clientId: string;
  visitTimestamp: string;
  client?: Pick<Client, "id" | "fullName" | "phone">;
};

export type Payment = {
  id: string;
  clientId: string;
  subscriptionId: string;
  amount: number;
  paymentTimestamp: string;
  client?: Pick<Client, "id" | "fullName" | "phone">;
  subscription?: Subscription;
};

export type Client = {
  id: string;
  fullName: string;
  phone: string;
  birthDate: string;
  photoUrl: string | null;
  createdAt: string;
  subscriptions: Subscription[];
  latestSubscription: Subscription | null;
  subscriptionStatus: SubscriptionStatus;
  canRegisterVisit: boolean;
  todayVisitsCount: number;
  lastVisitToday: Visit | null;
  hasVisitedToday: boolean;
};

export type ClientDetails = Client & {
  visits: Visit[];
  payments: Payment[];
  subscriptions: Subscription[];
  stats: {
    totalVisits: number;
    visitsThisMonth: number;
    todayVisitsCount: number;
    totalPaid: number;
    daysLeft: number;
  };
};

export type SubscriptionPlan = {
  label: string;
  durationDays: number;
  price: number;
};

export type DashboardStats = {
  todayCash: number;
  monthRevenue: number;
  activeClients: number;
  expiringClients: number;
  todayVisits: number;
  recentPayments: Payment[];
  recentVisits: Visit[];
  todayVisitLog: Visit[];
};

export type CreateClientPayload = {
  fullName: string;
  phone: string;
  birthDate: string;
  photoUrl?: string | null;
};

export type ActivateSubscriptionPayload = {
  type: SubscriptionType;
  price?: number;
};

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};
