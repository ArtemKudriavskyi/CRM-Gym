import type {
  ActivateSubscriptionPayload,
  Client,
  ClientDetails,
  ChangePasswordPayload,
  CreateClientPayload,
  DashboardStats,
  SubscriptionPlan,
  SubscriptionType
} from "../types/api";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
const TOKEN_KEY = "crm_gym_token";

type ApiErrorBody = {
  message?: string;
};

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY)
};

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const token = tokenStorage.get();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw new Error(body.message ?? "Помилка запиту до сервера");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};

const uploadRequest = async <T>(path: string, formData: FormData): Promise<T> => {
  const token = tokenStorage.get();
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: formData
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw new Error(body.message ?? "Помилка завантаження файлу");
  }

  return response.json() as Promise<T>;
};

export const api = {
  login: async (login: string, password: string) => {
    const data = await request<{ token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ login, password })
    });
    tokenStorage.set(data.token);
    return data;
  },
  getClients: () => request<Client[]>("/clients"),
  getClient: (clientId: string) => request<ClientDetails>(`/clients/${clientId}`),
  createClient: (payload: CreateClientPayload) =>
    request<Client>("/clients", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updateClient: (clientId: string, payload: Partial<CreateClientPayload>) =>
    request<Client>(`/clients/${clientId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  deleteClient: (clientId: string) =>
    request<void>(`/clients/${clientId}`, {
      method: "DELETE"
    }),
  activateSubscription: (clientId: string, payload: ActivateSubscriptionPayload) =>
    request(`/clients/${clientId}/subscriptions`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  registerVisit: (clientId: string) =>
    request(`/clients/${clientId}/visits`, {
      method: "POST"
    }),
  deleteVisit: (clientId: string, visitId: string) =>
    request<void>(`/clients/${clientId}/visits/${visitId}`, {
      method: "DELETE"
    }),
  getSubscriptionPlans: () =>
    request<Record<SubscriptionType, SubscriptionPlan>>("/subscriptions/plans"),
  getDashboardStats: () => request<DashboardStats>("/dashboard"),
  uploadClientPhoto: (file: File) => {
    const formData = new FormData();
    formData.append("photo", file);
    return uploadRequest<{ photoUrl: string }>("/uploads/client-photo", formData);
  },
  changePassword: (payload: ChangePasswordPayload) =>
    request<{ message: string }>("/auth/password", {
      method: "PATCH",
      body: JSON.stringify(payload)
    })
};
