import {
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Eye,
  KeyRound,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  UserPlus,
  Users
} from "lucide-react";
import type { Dispatch, FormEvent, ReactNode, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import { Modal } from "./components/Modal";
import { api, tokenStorage } from "./lib/api";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  statusCopy,
  subscriptionTypeLabels
} from "./lib/format";
import type {
  Client,
  ClientDetails,
  CreateClientPayload,
  DashboardStats,
  SubscriptionPlan,
  SubscriptionStatus,
  SubscriptionType
} from "./types/api";

type Toast = {
  type: "success" | "error";
  message: string;
};

type ClientFormState = CreateClientPayload;
type ClientFilter = "ALL" | SubscriptionStatus | "VISITED_TODAY";
type MobileView = "clients" | "today" | "analytics";

const emptyClientForm: ClientFormState = {
  fullName: "",
  phone: "",
  birthDate: "",
  photoUrl: ""
};

const emptyStats: DashboardStats = {
  todayCash: 0,
  monthRevenue: 0,
  activeClients: 0,
  expiringClients: 0,
  todayVisits: 0,
  recentPayments: [],
  recentVisits: [],
  todayVisitLog: []
};

const emptyPasswordForm = {
  currentPassword: "",
  newPassword: ""
};

const planOrder: SubscriptionType[] = ["MONTH", "THREE_MONTHS", "STUDENT"];
const filterOptions: Array<{ value: ClientFilter; label: string }> = [
  { value: "ALL", label: "Всі" },
  { value: "ACTIVE", label: "Активні" },
  { value: "EXPIRING_SOON", label: "Закінчуються" },
  { value: "EXPIRED", label: "Без доступу" },
  { value: "VISITED_TODAY", label: "Були сьогодні" }
];

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
const fileBaseUrl = apiBaseUrl.replace(/\/api\/?$/, "");

const getPhotoSrc = (photoUrl?: string | null) => {
  if (!photoUrl) {
    return null;
  }

  return photoUrl.startsWith("http") ? photoUrl : `${fileBaseUrl}${photoUrl}`;
};

const toDateInputValue = (date: string) => new Date(date).toISOString().slice(0, 10);

export const App = () => {
  const [token, setToken] = useState(() => tokenStorage.get());
  const [login, setLogin] = useState("admin");
  const [password, setPassword] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [plans, setPlans] = useState<Record<SubscriptionType, SubscriptionPlan> | null>(null);
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ClientFilter>("ALL");
  const [mobileView, setMobileView] = useState<MobileView>("today");
  const [toast, setToast] = useState<Toast | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [clientForm, setClientForm] = useState<ClientFormState>(emptyClientForm);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [subscriptionClient, setSubscriptionClient] = useState<Client | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionType>("MONTH");
  const [detailsClient, setDetailsClient] = useState<ClientDetails | null>(null);
  const [detailsTab, setDetailsTab] = useState<"subscriptions" | "visits" | "payments">("subscriptions");
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);

  const showToast = (type: Toast["type"], message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  };

  const clearSession = () => {
    tokenStorage.clear();
    setToken(null);
    setClients([]);
    setStats(emptyStats);
    setQuery("");
    setDetailsClient(null);
    setEditingClient(null);
    setSubscriptionClient(null);
  };

  const showApiError = (error: unknown, fallbackMessage: string) => {
    const message = error instanceof Error ? error.message : fallbackMessage;
    const normalizedMessage = message.toLowerCase();

    if (normalizedMessage.includes("токен") || normalizedMessage.includes("авторизац")) {
      clearSession();
      showToast("error", "Сесію завершено. Увійдіть ще раз");
      return;
    }

    showToast("error", message);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [clientsData, plansData, statsData] = await Promise.all([
        api.getClients(),
        api.getSubscriptionPlans(),
        api.getDashboardStats()
      ]);
      setClients(clientsData);
      setPlans(plansData);
      setStats(statsData);
    } catch (error) {
      showApiError(error, "Не вдалося завантажити дані");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      void loadData();
    }
  }, [token]);

  const filteredClients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return clients.filter((client) => {
      const matchesQuery =
        !normalizedQuery ||
        client.fullName.toLowerCase().includes(normalizedQuery) ||
        client.phone.toLowerCase().includes(normalizedQuery);
      const matchesFilter =
        filter === "ALL" ||
        (filter === "VISITED_TODAY" ? client.hasVisitedToday : client.subscriptionStatus === filter);

      return matchesQuery && matchesFilter;
    });
  }, [clients, query, filter]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const data = await api.login(login, password);
      setToken(data.token);
      setPassword("");
      showToast("success", "Вхід виконано");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Не вдалося увійти");
    } finally {
      setIsLoading(false);
    }
  };

  const uploadPhotoIfSelected = async (file?: File | null) => {
    if (!file) {
      return undefined;
    }

    const uploaded = await api.uploadClientPhoto(file);
    return uploaded.photoUrl;
  };

  const handleCreateClient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("photo") as HTMLInputElement | null;

    try {
      const uploadedPhotoUrl = await uploadPhotoIfSelected(fileInput?.files?.[0]);
      await api.createClient({
        ...clientForm,
        photoUrl: uploadedPhotoUrl ?? (clientForm.photoUrl?.trim() ? clientForm.photoUrl.trim() : null)
      });
      setClientForm(emptyClientForm);
      setClientModalOpen(false);
      form.reset();
      showToast("success", "Клієнта створено");
      await loadData();
    } catch (error) {
      showApiError(error, "Не вдалося створити клієнта");
    }
  };

  const handleUpdateClient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingClient) {
      return;
    }

    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("photo") as HTMLInputElement | null;

    try {
      const uploadedPhotoUrl = await uploadPhotoIfSelected(fileInput?.files?.[0]);
      await api.updateClient(editingClient.id, {
        ...clientForm,
        photoUrl: uploadedPhotoUrl ?? (clientForm.photoUrl?.trim() ? clientForm.photoUrl.trim() : null)
      });
      setEditingClient(null);
      setClientForm(emptyClientForm);
      showToast("success", "Клієнта оновлено");
      await loadData();
      if (detailsClient?.id === editingClient.id) {
        await openClientDetails(editingClient.id);
      }
    } catch (error) {
      showApiError(error, "Не вдалося оновити клієнта");
    }
  };

  const handleDeleteClient = async (client: Client) => {
    const confirmed = window.confirm(`Видалити клієнта "${client.fullName}" разом з історією?`);
    if (!confirmed) {
      return;
    }

    try {
      await api.deleteClient(client.id);
      showToast("success", "Клієнта видалено");
      if (detailsClient?.id === client.id) {
        setDetailsClient(null);
      }
      await loadData();
    } catch (error) {
      showApiError(error, "Не вдалося видалити клієнта");
    }
  };

  const handleActivateSubscription = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!subscriptionClient) {
      return;
    }

    try {
      await api.activateSubscription(subscriptionClient.id, { type: selectedPlan });
      setSubscriptionClient(null);
      showToast("success", "Абонемент активовано");
      await loadData();
      if (detailsClient?.id === subscriptionClient.id) {
        await openClientDetails(subscriptionClient.id);
      }
    } catch (error) {
      showApiError(error, "Не вдалося активувати абонемент");
    }
  };

  const handleRegisterVisit = async (client: Client) => {
    if (client.todayVisitsCount > 0) {
      const confirmed = window.confirm(
        `${client.fullName} вже був сьогодні ${client.todayVisitsCount} раз(и). Додати ще один візит?`
      );

      if (!confirmed) {
        return;
      }
    }

    try {
      await api.registerVisit(client.id);
      showToast("success", `Візит відмічено: ${client.fullName}`);
      await loadData();
      if (detailsClient?.id === client.id) {
        await openClientDetails(client.id);
      }
    } catch (error) {
      showApiError(error, "Не вдалося відмітити візит");
    }
  };

  const handleDeleteVisit = async (clientId: string, visitId: string) => {
    const confirmed = window.confirm("Прибрати цей візит з історії?");
    if (!confirmed) {
      return;
    }

    try {
      await api.deleteVisit(clientId, visitId);
      showToast("success", "Візит прибрано");
      await loadData();
      if (detailsClient?.id === clientId) {
        await openClientDetails(clientId);
      }
    } catch (error) {
      showApiError(error, "Не вдалося прибрати візит");
    }
  };

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await api.changePassword(passwordForm);
      setPasswordForm(emptyPasswordForm);
      setPasswordModalOpen(false);
      showToast("success", "Пароль змінено");
    } catch (error) {
      showApiError(error, "Не вдалося змінити пароль");
    }
  };

  const openClientDetails = async (clientId: string) => {
    try {
      const details = await api.getClient(clientId);
      setDetailsClient(details);
      setDetailsTab("subscriptions");
    } catch (error) {
      showApiError(error, "Не вдалося відкрити картку клієнта");
    }
  };

  const openEditClient = (client: Client) => {
    setEditingClient(client);
    setClientForm({
      fullName: client.fullName,
      phone: client.phone,
      birthDate: toDateInputValue(client.birthDate),
      photoUrl: client.photoUrl ?? ""
    });
  };

  const openSubscriptionModal = (client: Client) => {
    setSelectedPlan(client.latestSubscription?.type ?? "MONTH");
    setSubscriptionClient(client);
  };

  const handleLogout = () => {
    clearSession();
  };

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f7f9] px-4">
        <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-7">
            <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-slate-950 text-white">
              <Users className="size-6" />
            </div>
            <h1 className="text-2xl font-semibold text-slate-950">CRM Gym</h1>
            <p className="mt-2 text-sm text-slate-600">Панель адміністратора фітнес-центру</p>
          </div>
          <form className="space-y-4" onSubmit={handleLogin}>
            <Input label="Логін" value={login} onChange={setLogin} required autoComplete="username" />
            <Input
              label="Пароль"
              type="password"
              value={password}
              onChange={setPassword}
              required
              autoComplete="current-password"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex w-full items-center justify-center rounded-md bg-slate-950 px-4 py-2.5 font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              Увійти
            </button>
          </form>
        </section>
        {toast && <ToastMessage toast={toast} />}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">CRM Gym</h1>
            <p className="hidden text-sm text-slate-500 sm:block">Клієнти, абонементи, візити та каса</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <IconButton label="Змінити пароль" onClick={() => setPasswordModalOpen(true)}>
              <KeyRound className="size-5" />
            </IconButton>
            <IconButton label="Оновити" onClick={() => void loadData()}>
              <RefreshCw className={`size-5 ${isLoading ? "animate-spin" : ""}`} />
            </IconButton>
            <IconButton label="Вийти" onClick={handleLogout}>
              <LogOut className="size-5" />
            </IconButton>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="sticky top-0 z-30 -mx-3 mb-4 border-b border-slate-200 bg-[#f6f7f9]/95 px-3 py-3 backdrop-blur md:hidden">
          <div className="grid grid-cols-3 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            <MobileViewButton active={mobileView === "today"} onClick={() => setMobileView("today")}>
              Сьогодні
            </MobileViewButton>
            <MobileViewButton active={mobileView === "clients"} onClick={() => setMobileView("clients")}>
              Клієнти
            </MobileViewButton>
            <MobileViewButton active={mobileView === "analytics"} onClick={() => setMobileView("analytics")}>
              Аналітика
            </MobileViewButton>
          </div>
        </div>

        <section className={`${mobileView === "analytics" ? "grid" : "hidden"} gap-3 sm:gap-4 md:grid md:grid-cols-5`}>
          <MetricCard icon={<CreditCard className="size-5" />} label="Каса за сьогодні" value={formatCurrency(stats.todayCash)} />
          <MetricCard icon={<CalendarDays className="size-5" />} label="Дохід за місяць" value={formatCurrency(stats.monthRevenue)} />
          <MetricCard icon={<Users className="size-5" />} label="Активні клієнти" value={String(stats.activeClients)} />
          <MetricCard icon={<CalendarDays className="size-5" />} label="Закінчуються" value={String(stats.expiringClients)} />
          <MetricCard icon={<CheckCircle2 className="size-5" />} label="Візити сьогодні" value={String(stats.todayVisits)} />
        </section>

        <section className={`${mobileView === "clients" ? "hidden" : "grid"} mt-4 gap-3 sm:mt-6 sm:gap-4 md:grid xl:grid-cols-3`}>
          <ActivityList
            title="Останні платежі"
            className={`${mobileView === "analytics" ? "block" : "hidden"} order-2 md:block xl:order-1`}
          >
            {stats.recentPayments.length ? (
              stats.recentPayments.map((payment) => (
                <ActivityItem
                  key={payment.id}
                  title={`${payment.client?.fullName ?? "Клієнт"} - ${formatCurrency(payment.amount)}`}
                  subtitle={`${payment.subscription ? subscriptionTypeLabels[payment.subscription.type] : "Абонемент"} · ${formatDateTime(payment.paymentTimestamp)}`}
                />
              ))
            ) : (
              <EmptyLine text="Платежів ще немає" />
            )}
          </ActivityList>
          <ActivityList
            title="Останні візити"
            className={`${mobileView === "today" ? "block" : "hidden"} order-3 md:block xl:order-2`}
          >
            {stats.recentVisits.length ? (
              stats.recentVisits.map((visit) => (
                <ActivityItem
                  key={visit.id}
                  title={visit.client?.fullName ?? "Клієнт"}
                  subtitle={formatDateTime(visit.visitTimestamp)}
                />
              ))
            ) : (
              <EmptyLine text="Візитів ще немає" />
            )}
          </ActivityList>
          <ActivityList
            title="Журнал сьогоднішніх відвідувань"
            className={`${mobileView === "today" ? "block" : "hidden"} order-1 md:block xl:order-3`}
          >
            {stats.todayVisitLog.length ? (
              stats.todayVisitLog.map((visit) => (
                <VisitLogItem
                  key={visit.id}
                  title={visit.client?.fullName ?? "Клієнт"}
                  subtitle={formatDateTime(visit.visitTimestamp)}
                  onDelete={() => void handleDeleteVisit(visit.clientId, visit.id)}
                />
              ))
            ) : (
              <EmptyLine text="Сьогодні візитів ще немає" />
            )}
          </ActivityList>
        </section>

        <section className={`${mobileView === "clients" ? "block" : "hidden"} mt-4 md:block sm:mt-6`}>
          <div className="sticky top-0 z-20 -mx-3 mb-4 flex flex-col gap-3 border-b border-slate-200 bg-[#f6f7f9]/95 px-3 py-3 backdrop-blur sm:static sm:mx-0 sm:border-b-0 sm:bg-transparent sm:px-0 sm:py-0 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative w-full md:w-96">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Пошук за ПІБ або телефоном"
                  className="w-full rounded-md border border-slate-300 bg-white py-2 pl-10 pr-3 text-slate-950 outline-none focus:border-slate-950"
                />
              </div>
              <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFilter(option.value)}
                    className={`shrink-0 rounded-md border px-3 py-2 text-sm font-medium ${
                      filter === option.value
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setClientForm(emptyClientForm);
                setClientModalOpen(true);
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2 font-medium text-white hover:bg-slate-800"
            >
              <UserPlus className="size-5" />
              Додати клієнта
            </button>
          </div>

          <div className="grid gap-3 md:hidden">
            {filteredClients.map((client) => (
              <ClientMobileCard
                key={client.id}
                client={client}
                onDetails={() => void openClientDetails(client.id)}
                onActivate={() => openSubscriptionModal(client)}
                onVisit={() => void handleRegisterVisit(client)}
              />
            ))}
            {filteredClients.length === 0 && <EmptyLine text="Клієнтів не знайдено" />}
          </div>

          <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <Th>Клієнт</Th>
                    <Th>Абонемент</Th>
                    <Th>Статус</Th>
                    <Th>Дії</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredClients.map((client) => (
                    <ClientRow
                      key={client.id}
                      client={client}
                      onDetails={() => void openClientDetails(client.id)}
                      onActivate={() => openSubscriptionModal(client)}
                      onVisit={() => void handleRegisterVisit(client)}
                    />
                  ))}
                  {filteredClients.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500">
                        Клієнтів не знайдено
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {clientModalOpen && (
        <Modal title="Новий клієнт" onClose={() => setClientModalOpen(false)}>
          <ClientForm
            form={clientForm}
            setForm={setClientForm}
            submitLabel="Створити"
            onSubmit={handleCreateClient}
            onCancel={() => setClientModalOpen(false)}
          />
        </Modal>
      )}

      {editingClient && (
        <Modal title={`Редагування: ${editingClient.fullName}`} onClose={() => setEditingClient(null)}>
          <ClientForm
            form={clientForm}
            setForm={setClientForm}
            submitLabel="Зберегти"
            onSubmit={handleUpdateClient}
            onCancel={() => setEditingClient(null)}
          />
        </Modal>
      )}

      {detailsClient && (
        <ClientDetailsModal
          client={detailsClient}
          tab={detailsTab}
          setTab={setDetailsTab}
          onClose={() => setDetailsClient(null)}
          onEdit={() => {
            setDetailsClient(null);
            openEditClient(detailsClient);
          }}
          onActivate={() => openSubscriptionModal(detailsClient)}
          onDelete={() => void handleDeleteClient(detailsClient)}
          onDeleteVisit={(visitId) => void handleDeleteVisit(detailsClient.id, visitId)}
        />
      )}

      {subscriptionClient && plans && (
        <Modal title={`Абонемент: ${subscriptionClient.fullName}`} onClose={() => setSubscriptionClient(null)}>
          <form className="space-y-4" onSubmit={handleActivateSubscription}>
            <div className="grid gap-3">
              {planOrder.map((type) => (
                <SubscriptionPlanOption
                  key={type}
                  type={type}
                  plan={plans[type]}
                  selectedPlan={selectedPlan}
                  disabled={
                    subscriptionClient.subscriptionStatus !== "EXPIRED" &&
                    subscriptionClient.latestSubscription?.type !== type
                  }
                  onChange={() => setSelectedPlan(type)}
                />
              ))}
            </div>
            {subscriptionClient.subscriptionStatus !== "EXPIRED" && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                У клієнта вже є активний абонемент. Новий тариф можна активувати після завершення поточного.
              </p>
            )}
            <ModalActions
              submitLabel="Активувати"
              onCancel={() => setSubscriptionClient(null)}
              icon={<CreditCard className="size-5" />}
              disabled={subscriptionClient.subscriptionStatus !== "EXPIRED"}
            />
          </form>
        </Modal>
      )}

      {passwordModalOpen && (
        <Modal title="Зміна пароля" onClose={() => setPasswordModalOpen(false)}>
          <form className="space-y-4" onSubmit={handleChangePassword}>
            <Input
              label="Поточний пароль"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(value) => setPasswordForm((current) => ({ ...current, currentPassword: value }))}
              required
            />
            <Input
              label="Новий пароль"
              type="password"
              value={passwordForm.newPassword}
              onChange={(value) => setPasswordForm((current) => ({ ...current, newPassword: value }))}
              required
            />
            <ModalActions submitLabel="Змінити" onCancel={() => setPasswordModalOpen(false)} icon={<KeyRound className="size-5" />} />
          </form>
        </Modal>
      )}

      {toast && <ToastMessage toast={toast} />}
    </main>
  );
};

const ClientForm = ({
  form,
  setForm,
  submitLabel,
  onSubmit,
  onCancel
}: {
  form: ClientFormState;
  setForm: Dispatch<SetStateAction<ClientFormState>>;
  submitLabel: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) => (
  <form className="space-y-4" onSubmit={onSubmit}>
    <Input label="ПІБ" value={form.fullName} onChange={(value) => setForm((current) => ({ ...current, fullName: value }))} required />
    <Input label="Телефон" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} required />
    <Input
      label="Дата народження"
      type="date"
      value={form.birthDate}
      onChange={(value) => setForm((current) => ({ ...current, birthDate: value }))}
      required
    />
    <Input
      label="URL фото"
      value={form.photoUrl ?? ""}
      onChange={(value) => setForm((current) => ({ ...current, photoUrl: value }))}
    />
    <label className="block">
      <span className="text-sm font-medium text-slate-700">Завантажити фото</span>
      <input
        name="photo"
        type="file"
        accept="image/*"
        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
      />
    </label>
    <ModalActions submitLabel={submitLabel} onCancel={onCancel} icon={<Upload className="size-5" />} />
  </form>
);

const ClientDetailsModal = ({
  client,
  tab,
  setTab,
  onClose,
  onEdit,
  onActivate,
  onDelete,
  onDeleteVisit
}: {
  client: ClientDetails;
  tab: "subscriptions" | "visits" | "payments";
  setTab: (tab: "subscriptions" | "visits" | "payments") => void;
  onClose: () => void;
  onEdit: () => void;
  onActivate: () => void;
  onDelete: () => void;
  onDeleteVisit: (visitId: string) => void;
}) => {
  const status = statusCopy[client.subscriptionStatus];
  const photo = getPhotoSrc(client.photoUrl);

  return (
    <Modal title={`Картка: ${client.fullName}`} onClose={onClose}>
      <div className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row">
          {photo ? (
            <img src={photo} alt="" className="size-24 rounded-lg object-cover" />
          ) : (
            <div className="flex size-24 items-center justify-center rounded-lg bg-slate-100 text-3xl font-semibold text-slate-500">
              {client.fullName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-slate-950">{client.fullName}</h3>
              <span className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-700">
                <span className={`size-2.5 rounded-full ${status.dotClass}`} />
                {status.label}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">{client.phone}</p>
            <p className="text-sm text-slate-500">Дата народження: {formatDate(client.birthDate)}</p>
            <p className="mt-2 text-sm text-slate-700">
              Абонемент:{" "}
              {client.latestSubscription
                ? `${subscriptionTypeLabels[client.latestSubscription.type]} до ${formatDate(client.latestSubscription.endDate)}`
                : "відсутній"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3">
          <SmallStat label="Днів лишилось" value={String(client.stats.daysLeft)} />
          <SmallStat label="Візитів сьогодні" value={String(client.stats.todayVisitsCount)} />
          <SmallStat label="Візитів всього" value={String(client.stats.totalVisits)} />
          <SmallStat label="Візитів за місяць" value={String(client.stats.visitsThisMonth)} />
          <SmallStat label="Оплачено" value={formatCurrency(client.stats.totalPaid)} />
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onEdit} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Pencil className="size-4" />
            Редагувати
          </button>
          <button type="button" onClick={onActivate} className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">
            <CreditCard className="size-4" />
            Абонемент
          </button>
          <button type="button" onClick={onDelete} className="inline-flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100">
            <Trash2 className="size-4" />
            Видалити
          </button>
        </div>

        <div className="border-b border-slate-200">
          <div className="flex gap-2">
            <TabButton active={tab === "subscriptions"} onClick={() => setTab("subscriptions")}>Абонементи</TabButton>
            <TabButton active={tab === "visits"} onClick={() => setTab("visits")}>Візити</TabButton>
            <TabButton active={tab === "payments"} onClick={() => setTab("payments")}>Платежі</TabButton>
          </div>
        </div>

        {tab === "subscriptions" && (
          <div className="space-y-2">
            {client.subscriptions.length ? client.subscriptions.map((subscription) => (
              <HistoryRow
                key={subscription.id}
                title={`${subscriptionTypeLabels[subscription.type]} · ${formatCurrency(subscription.price)}`}
                subtitle={`${formatDate(subscription.startDate)} - ${formatDate(subscription.endDate)}`}
                meta={subscription.isActive ? "Активний" : "Завершений"}
              />
            )) : <EmptyLine text="Абонементів ще немає" />}
          </div>
        )}

        {tab === "visits" && (
          <div className="space-y-2">
            {client.visits.length ? client.visits.map((visit) => (
              <HistoryRow
                key={visit.id}
                title={formatDateTime(visit.visitTimestamp)}
                subtitle="Візит зареєстровано"
                action={
                  <button
                    type="button"
                    onClick={() => onDeleteVisit(visit.id)}
                    className="inline-flex size-8 items-center justify-center rounded-md text-rose-600 hover:bg-rose-50"
                    aria-label="Прибрати візит"
                    title="Прибрати візит"
                  >
                    <Trash2 className="size-4" />
                  </button>
                }
              />
            )) : <EmptyLine text="Візитів ще немає" />}
          </div>
        )}

        {tab === "payments" && (
          <div className="space-y-2">
            {client.payments.length ? client.payments.map((payment) => (
              <HistoryRow
                key={payment.id}
                title={`${formatCurrency(payment.amount)} · ${payment.subscription ? subscriptionTypeLabels[payment.subscription.type] : "Абонемент"}`}
                subtitle={formatDateTime(payment.paymentTimestamp)}
              />
            )) : <EmptyLine text="Платежів ще немає" />}
          </div>
        )}
      </div>
    </Modal>
  );
};

const ClientRow = ({
  client,
  onDetails,
  onActivate,
  onVisit
}: {
  client: Client;
  onDetails: () => void;
  onActivate: () => void;
  onVisit: () => void;
}) => {
  const status = statusCopy[client.subscriptionStatus];
  const photo = getPhotoSrc(client.photoUrl);

  return (
    <tr className={`border-l-4 ${status.rowClass} ${client.hasVisitedToday ? "bg-emerald-50/70" : ""}`}>
      <td className="whitespace-nowrap px-4 py-4">
        <div className="flex items-center gap-3">
          {photo ? (
            <img src={photo} alt="" className="size-11 rounded-md object-cover" />
          ) : (
            <div className="flex size-11 items-center justify-center rounded-md bg-slate-100 font-semibold text-slate-600">
              {client.fullName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-slate-950">{client.fullName}</p>
              {client.todayVisitsCount > 0 && (
                <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  сьогодні: {client.todayVisitsCount}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">{client.phone}</p>
            {client.lastVisitToday && (
              <p className="text-xs font-medium text-emerald-700">
                останній візит: {formatDateTime(client.lastVisitToday.visitTimestamp)}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
        {client.latestSubscription ? (
          <div>
            <p className="font-medium text-slate-950">{subscriptionTypeLabels[client.latestSubscription.type]}</p>
            <p className="text-slate-500">до {formatDate(client.latestSubscription.endDate)}</p>
          </div>
        ) : (
          <span className="text-slate-500">Відсутній</span>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-4">
        <span className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-700">
          <span className={`size-2.5 rounded-full ${status.dotClass}`} />
          {status.label}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-4">
        <div className="flex flex-wrap gap-2">
          <ActionButton label="Картка" onClick={onDetails} icon={<Eye className="size-4" />} />
          <ActionButton
            label={client.todayVisitsCount > 0 ? `Візит +${client.todayVisitsCount}` : "Візит"}
            onClick={onVisit}
            disabled={!client.canRegisterVisit}
            icon={<CheckCircle2 className="size-4" />}
          />
          <ActionButton label="Абонемент" onClick={onActivate} icon={<CreditCard className="size-4" />} />
        </div>
      </td>
    </tr>
  );
};

const ClientMobileCard = ({
  client,
  onDetails,
  onActivate,
  onVisit
}: {
  client: Client;
  onDetails: () => void;
  onActivate: () => void;
  onVisit: () => void;
}) => {
  const status = statusCopy[client.subscriptionStatus];
  const photo = getPhotoSrc(client.photoUrl);

  return (
    <article className={`rounded-lg border bg-white p-4 shadow-sm ${client.hasVisitedToday ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200"}`}>
      <div className="flex gap-3">
        {photo ? (
          <img src={photo} alt="" className="size-14 rounded-md object-cover" />
        ) : (
          <div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-slate-100 text-lg font-semibold text-slate-600">
            {client.fullName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold leading-tight text-slate-950">{client.fullName}</h3>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
              <span className={`size-2 rounded-full ${status.dotClass}`} />
              {status.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{client.phone}</p>
          <p className="mt-1 text-sm text-slate-700">
            {client.latestSubscription
              ? `${subscriptionTypeLabels[client.latestSubscription.type]} до ${formatDate(client.latestSubscription.endDate)}`
              : "Абонемент відсутній"}
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-sm text-slate-600">
        {client.todayVisitsCount > 0 && (
          <div className="rounded-md bg-emerald-100 px-3 py-2 font-medium text-emerald-800">
            Сьогодні: {client.todayVisitsCount}
            {client.lastVisitToday ? ` · останній ${formatDateTime(client.lastVisitToday.visitTimestamp)}` : ""}
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <ActionButton label="Візит" onClick={onVisit} disabled={!client.canRegisterVisit} icon={<CheckCircle2 className="size-4" />} />
        <ActionButton label="Картка" onClick={onDetails} icon={<Eye className="size-4" />} />
        <ActionButton label="Абонемент" onClick={onActivate} icon={<CreditCard className="size-4" />} />
      </div>
    </article>
  );
};

const MetricCard = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-teal-50 text-teal-700 sm:mb-4">{icon}</div>
    <p className="text-sm font-medium text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
  </div>
);

const ActivityList = ({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) => (
  <div className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
    <h2 className="mb-3 font-semibold text-slate-950">{title}</h2>
    <div className="space-y-2">{children}</div>
  </div>
);

const ActivityItem = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="rounded-md border border-slate-100 px-3 py-2">
    <p className="text-sm font-medium text-slate-950">{title}</p>
    <p className="text-xs text-slate-500">{subtitle}</p>
  </div>
);

const VisitLogItem = ({
  title,
  subtitle,
  onDelete
}: {
  title: string;
  subtitle: string;
  onDelete: () => void;
}) => (
  <div className="flex items-center justify-between gap-3 rounded-md border border-emerald-100 bg-emerald-50/70 px-3 py-2">
    <div>
      <p className="text-sm font-medium text-slate-950">{title}</p>
      <p className="text-xs text-slate-500">{subtitle}</p>
    </div>
    <button
      type="button"
      onClick={onDelete}
      className="inline-flex size-8 items-center justify-center rounded-md text-rose-600 hover:bg-rose-50"
      aria-label="Прибрати візит"
      title="Прибрати візит"
    >
      <Trash2 className="size-4" />
    </button>
  </div>
);

const HistoryRow = ({
  title,
  subtitle,
  meta,
  action
}: {
  title: string;
  subtitle: string;
  meta?: string;
  action?: ReactNode;
}) => (
  <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2">
    <div>
      <p className="text-sm font-medium text-slate-950">{title}</p>
      <p className="text-xs text-slate-500">{subtitle}</p>
    </div>
    {action ?? (meta && <span className="text-xs font-medium text-slate-500">{meta}</span>)}
  </div>
);

const SmallStat = ({ label, value }: { label: string; value: string }) => (
  <div className="min-w-0 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
    <p className="text-xs text-slate-500">{label}</p>
    <p className="break-words text-base font-semibold leading-tight text-slate-950">{value}</p>
  </div>
);

const SubscriptionPlanOption = ({
  type,
  plan,
  selectedPlan,
  disabled,
  onChange
}: {
  type: SubscriptionType;
  plan: SubscriptionPlan;
  selectedPlan: SubscriptionType;
  disabled: boolean;
  onChange: () => void;
}) => (
  <label
    className={`flex items-center justify-between rounded-md border p-4 ${
      disabled ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-55" : "cursor-pointer"
    } ${selectedPlan === type ? "border-slate-950 bg-slate-50" : "border-slate-200"}`}
  >
    <span>
      <span className="block font-medium text-slate-950">{subscriptionTypeLabels[type]}</span>
      <span className="text-sm text-slate-500">
        {plan.durationDays} днів, {formatCurrency(plan.price)}
      </span>
    </span>
    <input
      type="radio"
      name="subscriptionType"
      value={type}
      checked={selectedPlan === type}
      onChange={onChange}
      disabled={disabled}
      className="size-4 accent-slate-950 disabled:cursor-not-allowed"
    />
  </label>
);

const ActionButton = ({
  label,
  icon,
  onClick,
  disabled = false,
  danger = false
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 ${
      danger
        ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
    }`}
  >
    {icon}
    {label}
  </button>
);

const IconButton = ({ label, children, onClick }: { label: string; children: ReactNode; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex size-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
    aria-label={label}
    title={label}
  >
    {children}
  </button>
);

const MobileViewButton = ({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`min-h-10 rounded-md px-3 py-2 text-sm font-semibold ${
      active ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
    }`}
  >
    {children}
  </button>
);

const TabButton = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={`border-b-2 px-3 py-2 text-sm font-medium ${
      active ? "border-slate-950 text-slate-950" : "border-transparent text-slate-500 hover:text-slate-950"
    }`}
  >
    {children}
  </button>
);

const ModalActions = ({
  submitLabel,
  onCancel,
  icon,
  disabled = false
}: {
  submitLabel: string;
  onCancel: () => void;
  icon?: ReactNode;
  disabled?: boolean;
}) => (
  <div className="grid gap-2 pt-2 sm:flex sm:justify-end">
    <button type="button" onClick={onCancel} className="min-h-11 rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50">
      Скасувати
    </button>
    <button
      type="submit"
      disabled={disabled}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2 font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {icon}
      {submitLabel}
    </button>
  </div>
);

const Th = ({ children }: { children: ReactNode }) => (
  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{children}</th>
);

const Input = ({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  autoComplete
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) => (
  <label className="block">
    <span className="text-sm font-medium text-slate-700">{label}</span>
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required={required}
      autoComplete={autoComplete}
      className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-950"
    />
  </label>
);

const EmptyLine = ({ text }: { text: string }) => (
  <p className="rounded-md border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500">{text}</p>
);

const ToastMessage = ({ toast }: { toast: Toast }) => (
  <div
    className={`fixed bottom-5 right-5 z-[60] max-w-sm rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
      toast.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
    }`}
  >
    {toast.message}
  </div>
);
