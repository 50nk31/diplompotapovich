export type VacancyStatus = "new" | "updated" | "unchanged" | "archived";
export type LogLevel = "info" | "warning" | "error";

export interface DashboardMetric {
  label: string;
  value: string;
  delta: string;
}

export interface DashboardSystemSummary {
  activeSchedules: number;
  collectionsCount: number;
  archivedVacancies: number;
  lastRunAt: string | null;
}

export interface SourceRecord {
  id: number;
  name: string;
  baseUrl: string;
  specialty: string;
  region: string;
  status: "active" | "paused" | "error";
  lastCheckedAt: string | null;
  successRate: number;
  responseTimeMs: number;
  isDemo: boolean;
}

export interface RuleRecord {
  id: number;
  name: string;
  specialty: string;
  keywords: string[];
  exclusions: string[];
  regions: string[];
  scheduleCron: string;
  isActive: boolean;
  createdAt: string;
  lastTriggeredAt: string | null;
}

export interface VacancyRecord {
  id: number;
  externalId: string;
  title: string;
  company: string;
  location: string;
  specialty: string;
  salaryText: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  employmentType: string | null;
  sourceId: number;
  sourceName: string;
  sourceUrl: string;
  summary: string;
  description: string;
  publishedAt: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  status: VacancyStatus;
  matchedRuleIds: number[];
}

export interface VacancyHistoryRecord {
  id: number;
  vacancyId: number;
  changedAt: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
}

export interface LogRecord {
  id: number;
  level: LogLevel;
  title: string;
  description: string;
  createdAt: string;
  actor: string;
}

export interface DashboardPayload {
  metrics: DashboardMetric[];
  recentVacancies: VacancyRecord[];
  activeSources: SourceRecord[];
  recentLogs: LogRecord[];
  systemSummary: DashboardSystemSummary;
}

export interface VacanciesPayload {
  items: VacancyRecord[];
  specialties: string[];
  locations: string[];
  statuses: VacancyStatus[];
}

export interface AnalyticsPoint {
  label: string;
  count: number;
}

export interface AnalyticsPayload {
  vacancyTimeline: AnalyticsPoint[];
  specialtyDistribution: AnalyticsPoint[];
  regionDistribution: AnalyticsPoint[];
  salaryBands: AnalyticsPoint[];
  topCompanies: AnalyticsPoint[];
  sourcePerformance: Array<{
    sourceName: string;
    successRate: number;
    responseTimeMs: number;
  }>;
}

export interface CollectionFilters {
  search: string;
  specialty: string;
  location: string;
  status: string;
}

export interface CollectionRecord {
  id: number;
  name: string;
  description: string;
  filters: CollectionFilters;
  itemsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionItemRecord {
  id: number;
  collectionId: number;
  vacancyId: number;
  note: string | null;
  addedAt: string;
  vacancy: VacancyRecord;
}

export interface CollectionDetails extends CollectionRecord {
  items: CollectionItemRecord[];
}
