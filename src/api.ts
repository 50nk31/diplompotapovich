import type {
  AnalyticsPayload,
  CollectionDetails,
  CollectionFilters,
  CollectionRecord,
  DashboardPayload,
  LogRecord,
  RuleRecord,
  SourceRecord,
  VacancyHistoryRecord,
  VacancyRecord,
  VacanciesPayload,
} from "./types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
    ...init,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Ошибка запроса");
  }

  return (await response.json()) as T;
}

export function getDashboard() {
  return request<DashboardPayload>("/api/dashboard");
}

export function getVacancies(params: URLSearchParams) {
  return request<VacanciesPayload>(`/api/vacancies?${params.toString()}`);
}

export function getVacancyDetails(id: number) {
  return request<{ vacancy: VacancyRecord; history: VacancyHistoryRecord[] }>(`/api/vacancies/${id}`);
}

export function getRules() {
  return request<RuleRecord[]>("/api/rules");
}

export function createRule(payload: Omit<RuleRecord, "id" | "createdAt" | "lastTriggeredAt">) {
  return request<RuleRecord[]>("/api/rules", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateRule(id: number, payload: Omit<RuleRecord, "id" | "createdAt" | "lastTriggeredAt">) {
  return request<RuleRecord[]>(`/api/rules/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function getSources() {
  return request<SourceRecord[]>("/api/sources");
}

export function createSource(payload: Omit<SourceRecord, "id" | "lastCheckedAt">) {
  return request<SourceRecord[]>("/api/sources", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateSource(id: number, payload: Omit<SourceRecord, "id" | "lastCheckedAt">) {
  return request<SourceRecord[]>(`/api/sources/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function getCollections() {
  return request<CollectionRecord[]>("/api/collections");
}

export function getCollectionDetails(id: number) {
  return request<CollectionDetails>(`/api/collections/${id}`);
}

export function createCollection(payload: { name: string; description: string; filters: CollectionFilters }) {
  return request<CollectionRecord[]>("/api/collections", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function addVacancyToCollection(collectionId: number, payload: { vacancyId: number; note: string | null }) {
  return request<CollectionDetails>(`/api/collections/${collectionId}/items`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function removeVacancyFromCollection(collectionId: number, vacancyId: number) {
  return request<CollectionDetails>(`/api/collections/${collectionId}/items/${vacancyId}`, {
    method: "DELETE",
  });
}

export function runMonitoring() {
  return request<{ runNumber: number; updatedAt: string; totalVacancies: number }>("/api/monitoring/run", {
    method: "POST",
  });
}

export function getAnalytics() {
  return request<AnalyticsPayload>("/api/analytics/summary");
}

export function getLogs() {
  return request<LogRecord[]>("/api/logs");
}
