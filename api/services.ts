import type { Database } from "sql.js";
import axios from "axios";

import type {
  AnalyticsPayload,
  CollectionDetails,
  CollectionFilters,
  CollectionItemRecord,
  CollectionRecord,
  DashboardPayload,
  LogRecord,
  RuleRecord,
  SourceRecord,
  VacancyHistoryRecord,
  VacancyRecord,
  VacanciesPayload,
} from "../shared/types.js";
import { getDatabase, getScalarNumber, getScalarString, persistDatabase, queryRows, runStatement } from "./db.js";
import { demoTemplates } from "./mock-source-data.js";
import { notifyRulesChanged } from "./runtime.js";

type InsertableRule = Omit<RuleRecord, "id" | "createdAt" | "lastTriggeredAt">;
type InsertableSource = Omit<SourceRecord, "id" | "lastCheckedAt">;
type InsertableCollection = {
  name: string;
  description: string;
  filters: CollectionFilters;
};

type MonitoringRunOptions = {
  initialSeed?: boolean;
  trigger?: "seed" | "manual" | "schedule";
  ruleId?: number | null;
  actor?: string;
};

type IncomingVacancy = {
  externalId: string;
  title: string;
  company: string;
  location: string;
  specialty: string;
  salaryText: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  employmentType: string | null;
  sourceUrl: string;
  summary: string;
  description: string;
  publishedAt: string | null;
};

type HhVacancyResponse = {
  items: Array<{
    id: string;
    name: string;
    alternate_url?: string;
    published_at?: string;
    employer?: { name?: string };
    area?: { name?: string };
    professional_roles?: Array<{ name?: string }>;
    snippet?: { requirement?: string | null; responsibility?: string | null };
    employment?: { name?: string };
    salary?: {
      from?: number | null;
      to?: number | null;
      currency?: string | null;
    } | null;
  }>;
};

const defaultCollectionFilters: CollectionFilters = {
  search: "",
  specialty: "",
  location: "",
  status: "",
};

function mapSource(row: Record<string, unknown>): SourceRecord {
  return {
    id: Number(row.id),
    name: String(row.name),
    baseUrl: String(row.baseUrl),
    specialty: String(row.specialty),
    region: String(row.region),
    status: row.status as SourceRecord["status"],
    lastCheckedAt: row.lastCheckedAt ? String(row.lastCheckedAt) : null,
    successRate: Number(row.successRate),
    responseTimeMs: Number(row.responseTimeMs),
    isDemo: Boolean(row.isDemo),
  };
}

function mapRule(row: Record<string, unknown>): RuleRecord {
  return {
    id: Number(row.id),
    name: String(row.name),
    specialty: String(row.specialty),
    keywords: JSON.parse(String(row.keywords)),
    exclusions: JSON.parse(String(row.exclusions)),
    regions: JSON.parse(String(row.regions)),
    scheduleCron: String(row.scheduleCron),
    isActive: Boolean(row.isActive),
    createdAt: String(row.createdAt),
    lastTriggeredAt: row.lastTriggeredAt ? String(row.lastTriggeredAt) : null,
  };
}

function mapVacancy(row: Record<string, unknown>): VacancyRecord {
  return {
    id: Number(row.id),
    externalId: String(row.externalId),
    title: String(row.title),
    company: String(row.company),
    location: String(row.location),
    specialty: String(row.specialty),
    salaryText: row.salaryText ? String(row.salaryText) : null,
    salaryMin: row.salaryMin === null ? null : Number(row.salaryMin),
    salaryMax: row.salaryMax === null ? null : Number(row.salaryMax),
    employmentType: row.employmentType ? String(row.employmentType) : null,
    sourceId: Number(row.sourceId),
    sourceName: String(row.sourceName),
    sourceUrl: String(row.sourceUrl),
    summary: String(row.summary),
    description: String(row.description),
    publishedAt: row.publishedAt ? String(row.publishedAt) : null,
    firstSeenAt: String(row.firstSeenAt),
    lastSeenAt: String(row.lastSeenAt),
    status: row.status as VacancyRecord["status"],
    matchedRuleIds: JSON.parse(String(row.matchedRuleIds)),
  };
}

function mapLog(row: Record<string, unknown>): LogRecord {
  return {
    id: Number(row.id),
    level: row.level as LogRecord["level"],
    title: String(row.title),
    description: String(row.description),
    createdAt: String(row.createdAt),
    actor: String(row.actor),
  };
}

function mapHistory(row: Record<string, unknown>): VacancyHistoryRecord {
  return {
    id: Number(row.id),
    vacancyId: Number(row.vacancyId),
    changedAt: String(row.changedAt),
    fieldName: String(row.fieldName),
    oldValue: row.oldValue ? String(row.oldValue) : null,
    newValue: row.newValue ? String(row.newValue) : null,
  };
}

function mapCollection(row: Record<string, unknown>): CollectionRecord {
  return {
    id: Number(row.id),
    name: String(row.name),
    description: String(row.description),
    filters: row.filters ? { ...defaultCollectionFilters, ...JSON.parse(String(row.filters)) } : defaultCollectionFilters,
    itemsCount: Number(row.itemsCount ?? 0),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function mapCollectionItem(row: Record<string, unknown>): CollectionItemRecord {
  return {
    id: Number(row.id),
    collectionId: Number(row.collectionId),
    vacancyId: Number(row.vacancyId),
    note: row.note ? String(row.note) : null,
    addedAt: String(row.addedAt),
    vacancy: {
      id: Number(row.vacancy_id),
      externalId: String(row.vacancy_externalId),
      title: String(row.vacancy_title),
      company: String(row.vacancy_company),
      location: String(row.vacancy_location),
      specialty: String(row.vacancy_specialty),
      salaryText: row.vacancy_salaryText ? String(row.vacancy_salaryText) : null,
      salaryMin: row.vacancy_salaryMin === null ? null : Number(row.vacancy_salaryMin),
      salaryMax: row.vacancy_salaryMax === null ? null : Number(row.vacancy_salaryMax),
      employmentType: row.vacancy_employmentType ? String(row.vacancy_employmentType) : null,
      sourceId: Number(row.vacancy_sourceId),
      sourceName: String(row.vacancy_sourceName),
      sourceUrl: String(row.vacancy_sourceUrl),
      summary: String(row.vacancy_summary),
      description: String(row.vacancy_description),
      publishedAt: row.vacancy_publishedAt ? String(row.vacancy_publishedAt) : null,
      firstSeenAt: String(row.vacancy_firstSeenAt),
      lastSeenAt: String(row.vacancy_lastSeenAt),
      status: row.vacancy_status as VacancyRecord["status"],
      matchedRuleIds: JSON.parse(String(row.vacancy_matchedRuleIds)),
    },
  };
}

function escapeLike(value: string) {
  return value.replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function setMetaValue(db: Database, key: string, value: string) {
  runStatement(
    db,
    "INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value],
  );
}

function insertLog(db: Database, level: LogRecord["level"], title: string, description: string, actor = "system") {
  runStatement(
    db,
    "INSERT INTO system_logs (level, title, description, createdAt, actor) VALUES (?, ?, ?, ?, ?)",
    [level, title, description, new Date().toISOString(), actor],
  );
}

function updateRunCount(db: Database) {
  const current = Number(getScalarString(db, "SELECT value FROM meta WHERE key = ?", ["monitorRunCount"]) || "0");
  const nextValue = String(current + 1);
  setMetaValue(db, "monitorRunCount", nextValue);
  return current + 1;
}

function getSourceIdBySpecialty(db: Database, specialty: string) {
  const rows = queryRows<{ id: number }>(db, "SELECT id FROM sources WHERE specialty = ? ORDER BY id LIMIT 1", [specialty]);
  return Number(rows[0]?.id ?? 1);
}

function getRuleIdsBySpecialty(db: Database, specialty: string) {
  return queryRows<{ id: number }>(db, "SELECT id FROM monitoring_rules WHERE specialty = ? AND isActive = 1", [specialty]).map(
    (row) => Number(row.id),
  );
}

function createSalaryText(salary: HhVacancyResponse["items"][number]["salary"]) {
  if (!salary || (!salary.from && !salary.to)) {
    return null;
  }

  const currency = salary.currency === "RUR" ? "руб." : (salary.currency ?? "").trim();

  if (salary.from && salary.to) {
    return `${salary.from.toLocaleString("ru-RU")} - ${salary.to.toLocaleString("ru-RU")} ${currency}`.trim();
  }

  if (salary.from) {
    return `от ${salary.from.toLocaleString("ru-RU")} ${currency}`.trim();
  }

  return `до ${salary.to?.toLocaleString("ru-RU")} ${currency}`.trim();
}

function compactText(value: string | null | undefined) {
  return (value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchHhVacancies(): Promise<IncomingVacancy[]> {
  const response = await axios.get<HhVacancyResponse>("https://api.hh.ru/vacancies", {
    params: {
      text: "frontend OR typescript OR аналитик OR linux",
      area: 113,
      per_page: 20,
      order_by: "publication_time",
    },
    headers: {
      "User-Agent": "vacancy-monitoring-prototype/1.0",
      "HH-User-Agent": "vacancy-monitoring-prototype/1.0",
    },
    timeout: 3500,
  });

  return response.data.items.map((item) => {
    const requirement = compactText(item.snippet?.requirement);
    const responsibility = compactText(item.snippet?.responsibility);
    const summary = [requirement, responsibility].filter(Boolean).join(" ");
    const specialty = item.professional_roles?.[0]?.name || "Вакансии hh.ru";

    return {
      externalId: `hh-${item.id}`,
      title: item.name,
      company: item.employer?.name || "Компания не указана",
      location: item.area?.name || "Регион не указан",
      specialty,
      salaryText: createSalaryText(item.salary),
      salaryMin: item.salary?.from ?? null,
      salaryMax: item.salary?.to ?? null,
      employmentType: item.employment?.name ?? null,
      sourceUrl: item.alternate_url || "https://hh.ru",
      summary: summary || "Описание доступно на странице вакансии.",
      description: summary || "Описание доступно на странице вакансии.",
      publishedAt: item.published_at ?? null,
    };
  });
}

function getOrCreateHhSource(db: Database) {
  const existing = queryRows<{ id: number }>(db, "SELECT id FROM sources WHERE baseUrl = ? ORDER BY id LIMIT 1", [
    "https://hh.ru",
  ])[0];

  if (existing) {
    return Number(existing.id);
  }

  runStatement(
    db,
    `INSERT INTO sources (name, baseUrl, specialty, region, status, lastCheckedAt, successRate, responseTimeMs, isDemo)
     VALUES (?, ?, ?, ?, ?, NULL, ?, ?, 0)`,
    ["hh.ru", "https://hh.ru", "Вакансии hh.ru", "Россия", "active", 95, 900],
  );

  return getScalarNumber(db, "SELECT last_insert_rowid() AS value");
}

function createPublishedDate(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() - offsetDays);
  return date.toISOString();
}

function createVariant(index: number, runNumber: number) {
  const template = demoTemplates[index % demoTemplates.length];
  const salaryShift = runNumber % 2 === 0 ? 10000 : 0;
  const isUpdated = runNumber > 1 && index === runNumber % demoTemplates.length;
  const salaryMin = template.salaryMin + salaryShift;
  const salaryMax = template.salaryMax + salaryShift;

  return {
    ...template,
    summary: isUpdated ? `${template.summary} Зафиксировано изменение условий оплаты.` : template.summary,
    description: isUpdated
      ? `${template.description} Дополнительно отмечено обновление параметров предложения и условий сотрудничества.`
      : template.description,
    salaryText: `${salaryMin.toLocaleString("ru-RU")} - ${salaryMax.toLocaleString("ru-RU")} ₽`,
    salaryMin,
    salaryMax,
    isUpdated,
  };
}

function upsertVacancy(
  db: Database,
  sourceId: number,
  sourceName: string,
  vacancy: IncomingVacancy,
  timestamp: string,
  initialSeed: boolean,
) {
  const ruleIds = getRuleIdsBySpecialty(db, vacancy.specialty);
  const existingRow = queryRows<Record<string, unknown>>(
    db,
    "SELECT * FROM vacancies WHERE sourceId = ? AND externalId = ?",
    [sourceId, vacancy.externalId],
  )[0];

  if (!existingRow) {
    runStatement(
      db,
      `INSERT INTO vacancies (
        externalId, title, company, location, specialty, salaryText, salaryMin, salaryMax,
        employmentType, sourceId, sourceName, sourceUrl, summary, description, publishedAt,
        firstSeenAt, lastSeenAt, status, matchedRuleIds
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        vacancy.externalId,
        vacancy.title,
        vacancy.company,
        vacancy.location,
        vacancy.specialty,
        vacancy.salaryText,
        vacancy.salaryMin,
        vacancy.salaryMax,
        vacancy.employmentType,
        sourceId,
        sourceName,
        vacancy.sourceUrl,
        vacancy.summary,
        vacancy.description,
        vacancy.publishedAt,
        timestamp,
        timestamp,
        "new",
        JSON.stringify(ruleIds),
      ],
    );

    const vacancyId = getScalarNumber(db, "SELECT last_insert_rowid() AS value");
    runStatement(
      db,
      "INSERT INTO vacancy_history (vacancyId, changedAt, fieldName, oldValue, newValue) VALUES (?, ?, ?, ?, ?)",
      [vacancyId, timestamp, "status", null, "new"],
    );
    return;
  }

  const existing = mapVacancy(existingRow);
  const hasSalaryChanged = existing.salaryText !== vacancy.salaryText;
  const newStatus = hasSalaryChanged ? "updated" : initialSeed ? "new" : "unchanged";

  runStatement(
    db,
    `UPDATE vacancies
     SET title = ?, company = ?, location = ?, specialty = ?, salaryText = ?, salaryMin = ?, salaryMax = ?,
         employmentType = ?, sourceUrl = ?, summary = ?, description = ?, publishedAt = ?, lastSeenAt = ?, status = ?, matchedRuleIds = ?
     WHERE id = ?`,
    [
      vacancy.title,
      vacancy.company,
      vacancy.location,
      vacancy.specialty,
      vacancy.salaryText,
      vacancy.salaryMin,
      vacancy.salaryMax,
      vacancy.employmentType,
      vacancy.sourceUrl,
      vacancy.summary,
      vacancy.description,
      vacancy.publishedAt,
      timestamp,
      newStatus,
      JSON.stringify(ruleIds),
      existing.id,
    ],
  );

  if (hasSalaryChanged) {
    runStatement(
      db,
      "INSERT INTO vacancy_history (vacancyId, changedAt, fieldName, oldValue, newValue) VALUES (?, ?, ?, ?, ?)",
      [existing.id, timestamp, "salaryText", existing.salaryText, vacancy.salaryText],
    );
  }
}

async function ensureStarterCollection(db: Database) {
  const collectionsCount = getScalarNumber(db, "SELECT COUNT(*) AS value FROM saved_collections");
  const vacancies = queryRows<Record<string, unknown>>(
    db,
    "SELECT * FROM vacancies WHERE status != 'archived' ORDER BY datetime(lastSeenAt) DESC LIMIT 2",
  ).map(mapVacancy);

  if (collectionsCount > 0 || vacancies.length === 0) {
    return;
  }

  const now = new Date().toISOString();

  runStatement(
    db,
    `INSERT INTO saved_collections (name, description, filters, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?)`,
    [
      "Приоритетные позиции",
      "Подборка для быстрого просмотра актуальных предложений с изменениями.",
      JSON.stringify({ ...defaultCollectionFilters, status: "new" }),
      now,
      now,
    ],
  );

  const collectionId = getScalarNumber(db, "SELECT last_insert_rowid() AS value");
  vacancies.forEach((vacancy, index) => {
    runStatement(
      db,
      "INSERT INTO collection_items (collectionId, vacancyId, note, addedAt) VALUES (?, ?, ?, ?)",
      [collectionId, vacancy.id, index === 0 ? "Начальная контрольная позиция." : null, now],
    );
  });

  insertLog(db, "info", "Создана стартовая подборка", "Сформирована первая подборка для обзора актуальных вакансий.", "system");
}

function getCollectionsBaseQuery() {
  return `
    SELECT c.*,
      COUNT(ci.id) AS itemsCount
    FROM saved_collections c
    LEFT JOIN collection_items ci ON ci.collectionId = c.id
    GROUP BY c.id
  `;
}

export async function ensureMonitoringSeed() {
  const db = await getDatabase();
  const vacanciesCount = getScalarNumber(db, "SELECT COUNT(*) AS value FROM vacancies");

  if (vacanciesCount === 0) {
    await runMonitoring({ initialSeed: true, trigger: "seed" });
    return;
  }

  await ensureStarterCollection(db);
  await persistDatabase();
}

export async function getDashboardData(): Promise<DashboardPayload> {
  await ensureMonitoringSeed();
  const db = await getDatabase();
  const totalVacancies = getScalarNumber(db, "SELECT COUNT(*) AS value FROM vacancies WHERE status != 'archived'");
  const newVacancies = getScalarNumber(db, "SELECT COUNT(*) AS value FROM vacancies WHERE status = 'new'");
  const activeRules = getScalarNumber(db, "SELECT COUNT(*) AS value FROM monitoring_rules WHERE isActive = 1");
  const problemSources = getScalarNumber(db, "SELECT COUNT(*) AS value FROM sources WHERE status != 'active'");
  const recentChanges = getScalarNumber(
    db,
    "SELECT COUNT(*) AS value FROM vacancy_history WHERE changedAt >= datetime('now', '-7 day')",
  );
  const collectionsCount = getScalarNumber(db, "SELECT COUNT(*) AS value FROM saved_collections");
  const archivedVacancies = getScalarNumber(db, "SELECT COUNT(*) AS value FROM vacancies WHERE status = 'archived'");
  const lastRunAt = getScalarString(db, "SELECT value FROM meta WHERE key = ?", ["lastMonitoringRunAt"]) || null;

  const recentVacancies = queryRows<Record<string, unknown>>(
    db,
    "SELECT * FROM vacancies ORDER BY datetime(lastSeenAt) DESC LIMIT 6",
  ).map(mapVacancy);
  const activeSources = queryRows<Record<string, unknown>>(
    db,
    "SELECT * FROM sources ORDER BY status = 'active' DESC, successRate DESC, responseTimeMs ASC LIMIT 4",
  ).map(mapSource);
  const recentLogs = queryRows<Record<string, unknown>>(
    db,
    "SELECT * FROM system_logs ORDER BY datetime(createdAt) DESC LIMIT 8",
  ).map(mapLog);

  return {
    metrics: [
      { label: "Активные вакансии", value: totalVacancies.toString(), delta: `${newVacancies} новых в текущем цикле` },
      { label: "Правила мониторинга", value: activeRules.toString(), delta: `${activeRules} профилей выполняются автоматически` },
      { label: "Источники с ошибками", value: problemSources.toString(), delta: problemSources === 0 ? "Контур работает стабильно" : "Требуется техническая проверка" },
      { label: "Изменения за 7 дней", value: recentChanges.toString(), delta: `${collectionsCount} подборок сохранено оператором` },
    ],
    recentVacancies,
    activeSources,
    recentLogs,
    systemSummary: {
      activeSchedules: activeRules,
      collectionsCount,
      archivedVacancies,
      lastRunAt,
    },
  };
}

export async function getVacancies(filters: {
  search?: string;
  specialty?: string;
  location?: string;
  status?: string;
}): Promise<VacanciesPayload> {
  await ensureMonitoringSeed();
  const db = await getDatabase();
  const conditions: string[] = [];
  const params: Array<string | number | null> = [];

  if (filters.search) {
    conditions.push("(title LIKE ? ESCAPE '\\' OR company LIKE ? ESCAPE '\\' OR summary LIKE ? ESCAPE '\\')");
    const pattern = `%${escapeLike(filters.search)}%`;
    params.push(pattern, pattern, pattern);
  }

  if (filters.specialty) {
    conditions.push("specialty = ?");
    params.push(filters.specialty);
  }

  if (filters.location) {
    conditions.push("location = ?");
    params.push(filters.location);
  }

  if (filters.status) {
    conditions.push("status = ?");
    params.push(filters.status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const items = queryRows<Record<string, unknown>>(
    db,
    `SELECT * FROM vacancies ${where} ORDER BY
      CASE status WHEN 'new' THEN 1 WHEN 'updated' THEN 2 WHEN 'unchanged' THEN 3 ELSE 4 END,
      datetime(lastSeenAt) DESC`,
    params,
  ).map(mapVacancy);

  const specialties = queryRows<{ value: string }>(
    db,
    "SELECT DISTINCT specialty AS value FROM vacancies ORDER BY specialty",
  ).map((row) => row.value);
  const locations = queryRows<{ value: string }>(db, "SELECT DISTINCT location AS value FROM vacancies ORDER BY location").map(
    (row) => row.value,
  );

  return {
    items,
    specialties,
    locations,
    statuses: ["new", "updated", "unchanged", "archived"],
  };
}

export async function getVacancyDetails(id: number) {
  await ensureMonitoringSeed();
  const db = await getDatabase();
  const vacancy = queryRows<Record<string, unknown>>(db, "SELECT * FROM vacancies WHERE id = ?", [id]).map(mapVacancy)[0];

  if (!vacancy) {
    return null;
  }

  const history = queryRows<Record<string, unknown>>(
    db,
    "SELECT * FROM vacancy_history WHERE vacancyId = ? ORDER BY datetime(changedAt) DESC",
    [id],
  ).map(mapHistory);

  return { vacancy, history };
}

export async function getRules() {
  const db = await getDatabase();
  return queryRows<Record<string, unknown>>(
    db,
    "SELECT * FROM monitoring_rules ORDER BY isActive DESC, datetime(createdAt) DESC",
  ).map(mapRule);
}

export async function createRule(rule: InsertableRule) {
  const db = await getDatabase();
  const now = new Date().toISOString();

  runStatement(
    db,
    `INSERT INTO monitoring_rules (name, specialty, keywords, exclusions, regions, scheduleCron, isActive, createdAt, lastTriggeredAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    [
      rule.name,
      rule.specialty,
      JSON.stringify(rule.keywords),
      JSON.stringify(rule.exclusions),
      JSON.stringify(rule.regions),
      rule.scheduleCron,
      rule.isActive ? 1 : 0,
      now,
    ],
  );

  insertLog(db, "info", "Создано правило", `Добавлено правило "${rule.name}" для направления "${rule.specialty}".`, "operator");
  await persistDatabase();
  notifyRulesChanged();

  return getRules();
}

export async function updateRule(id: number, rule: InsertableRule) {
  const db = await getDatabase();

  runStatement(
    db,
    `UPDATE monitoring_rules
     SET name = ?, specialty = ?, keywords = ?, exclusions = ?, regions = ?, scheduleCron = ?, isActive = ?
     WHERE id = ?`,
    [
      rule.name,
      rule.specialty,
      JSON.stringify(rule.keywords),
      JSON.stringify(rule.exclusions),
      JSON.stringify(rule.regions),
      rule.scheduleCron,
      rule.isActive ? 1 : 0,
      id,
    ],
  );

  insertLog(db, "info", "Правило обновлено", `Изменены параметры правила #${id}.`, "operator");
  await persistDatabase();
  notifyRulesChanged();

  return getRules();
}

export async function getSources() {
  const db = await getDatabase();
  return queryRows<Record<string, unknown>>(db, "SELECT * FROM sources ORDER BY specialty, name").map(mapSource);
}

export async function createSource(source: InsertableSource) {
  const db = await getDatabase();

  runStatement(
    db,
    `INSERT INTO sources (name, baseUrl, specialty, region, status, lastCheckedAt, successRate, responseTimeMs, isDemo)
     VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
    [
      source.name,
      source.baseUrl,
      source.specialty,
      source.region,
      source.status,
      source.successRate,
      source.responseTimeMs,
      source.isDemo ? 1 : 0,
    ],
  );

  insertLog(db, "info", "Добавлен источник", `Источник "${source.name}" включен в контур мониторинга.`, "operator");
  await persistDatabase();

  return getSources();
}

export async function updateSource(id: number, source: InsertableSource) {
  const db = await getDatabase();

  runStatement(
    db,
    `UPDATE sources
     SET name = ?, baseUrl = ?, specialty = ?, region = ?, status = ?, successRate = ?, responseTimeMs = ?, isDemo = ?
     WHERE id = ?`,
    [
      source.name,
      source.baseUrl,
      source.specialty,
      source.region,
      source.status,
      source.successRate,
      source.responseTimeMs,
      source.isDemo ? 1 : 0,
      id,
    ],
  );

  insertLog(db, "info", "Источник обновлён", `Параметры источника #${id} были изменены.`, "operator");
  await persistDatabase();

  return getSources();
}

export async function getCollections() {
  await ensureMonitoringSeed();
  const db = await getDatabase();
  return queryRows<Record<string, unknown>>(
    db,
    `${getCollectionsBaseQuery()} ORDER BY datetime(c.updatedAt) DESC, c.name ASC`,
  ).map(mapCollection);
}

export async function createCollection(collection: InsertableCollection) {
  const db = await getDatabase();
  const now = new Date().toISOString();

  runStatement(
    db,
    `INSERT INTO saved_collections (name, description, filters, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?)`,
    [collection.name, collection.description, JSON.stringify(collection.filters), now, now],
  );

  insertLog(db, "info", "Подборка создана", `Создана подборка "${collection.name}".`, "operator");
  await persistDatabase();

  return getCollections();
}

export async function getCollectionDetails(id: number): Promise<CollectionDetails | null> {
  await ensureMonitoringSeed();
  const db = await getDatabase();
  const collectionRow = queryRows<Record<string, unknown>>(db, `${getCollectionsBaseQuery()} HAVING c.id = ?`, [id])[0];

  if (!collectionRow) {
    return null;
  }

  const items = queryRows<Record<string, unknown>>(
    db,
    `SELECT
      ci.id,
      ci.collectionId,
      ci.vacancyId,
      ci.note,
      ci.addedAt,
      v.id AS vacancy_id,
      v.externalId AS vacancy_externalId,
      v.title AS vacancy_title,
      v.company AS vacancy_company,
      v.location AS vacancy_location,
      v.specialty AS vacancy_specialty,
      v.salaryText AS vacancy_salaryText,
      v.salaryMin AS vacancy_salaryMin,
      v.salaryMax AS vacancy_salaryMax,
      v.employmentType AS vacancy_employmentType,
      v.sourceId AS vacancy_sourceId,
      v.sourceName AS vacancy_sourceName,
      v.sourceUrl AS vacancy_sourceUrl,
      v.summary AS vacancy_summary,
      v.description AS vacancy_description,
      v.publishedAt AS vacancy_publishedAt,
      v.firstSeenAt AS vacancy_firstSeenAt,
      v.lastSeenAt AS vacancy_lastSeenAt,
      v.status AS vacancy_status,
      v.matchedRuleIds AS vacancy_matchedRuleIds
     FROM collection_items ci
     INNER JOIN vacancies v ON v.id = ci.vacancyId
     WHERE ci.collectionId = ?
     ORDER BY datetime(ci.addedAt) DESC`,
    [id],
  ).map(mapCollectionItem);

  return {
    ...mapCollection(collectionRow),
    items,
  };
}

export async function addCollectionItem(collectionId: number, vacancyId: number, note: string | null) {
  await ensureMonitoringSeed();
  const db = await getDatabase();
  const now = new Date().toISOString();

  const collectionExists = getScalarNumber(db, "SELECT COUNT(*) AS value FROM saved_collections WHERE id = ?", [collectionId]) > 0;
  const vacancyExists = getScalarNumber(db, "SELECT COUNT(*) AS value FROM vacancies WHERE id = ?", [vacancyId]) > 0;

  if (!collectionExists) {
    throw new Error("Подборка не найдена");
  }

  if (!vacancyExists) {
    throw new Error("Вакансия не найдена");
  }

  const alreadyExists =
    getScalarNumber(
      db,
      "SELECT COUNT(*) AS value FROM collection_items WHERE collectionId = ? AND vacancyId = ?",
      [collectionId, vacancyId],
    ) > 0;

  if (!alreadyExists) {
    runStatement(
      db,
      "INSERT INTO collection_items (collectionId, vacancyId, note, addedAt) VALUES (?, ?, ?, ?)",
      [collectionId, vacancyId, note, now],
    );
  } else {
    runStatement(
      db,
      "UPDATE collection_items SET note = ?, addedAt = ? WHERE collectionId = ? AND vacancyId = ?",
      [note, now, collectionId, vacancyId],
    );
  }

  runStatement(db, "UPDATE saved_collections SET updatedAt = ? WHERE id = ?", [now, collectionId]);
  insertLog(db, "info", "Подборка обновлена", `Вакансия #${vacancyId} добавлена в подборку #${collectionId}.`, "operator");
  await persistDatabase();

  return getCollectionDetails(collectionId);
}

export async function removeCollectionItem(collectionId: number, vacancyId: number) {
  const db = await getDatabase();
  const now = new Date().toISOString();

  runStatement(db, "DELETE FROM collection_items WHERE collectionId = ? AND vacancyId = ?", [collectionId, vacancyId]);
  runStatement(db, "UPDATE saved_collections SET updatedAt = ? WHERE id = ?", [now, collectionId]);
  insertLog(db, "info", "Элемент удалён из подборки", `Вакансия #${vacancyId} удалена из подборки #${collectionId}.`, "operator");
  await persistDatabase();

  return getCollectionDetails(collectionId);
}

export async function getAnalytics(): Promise<AnalyticsPayload> {
  await ensureMonitoringSeed();
  const db = await getDatabase();
  const vacancyTimeline = queryRows<{ label: string; count: number }>(
    db,
    `SELECT substr(firstSeenAt, 1, 10) AS label, COUNT(*) AS count
     FROM vacancies
     GROUP BY substr(firstSeenAt, 1, 10)
     ORDER BY label ASC`,
  );
  const specialtyDistribution = queryRows<{ label: string; count: number }>(
    db,
    `SELECT specialty AS label, COUNT(*) AS count
     FROM vacancies
     WHERE status != 'archived'
     GROUP BY specialty
     ORDER BY count DESC`,
  );
  const regionDistribution = queryRows<{ label: string; count: number }>(
    db,
    `SELECT location AS label, COUNT(*) AS count
     FROM vacancies
     WHERE status != 'archived'
     GROUP BY location
     ORDER BY count DESC
     LIMIT 6`,
  );
  const salaryBands = queryRows<{ label: string; count: number }>(
    db,
    `SELECT
      CASE
        WHEN salaryMin IS NULL THEN 'Без диапазона'
        WHEN salaryMin < 150000 THEN 'До 150 тыс.'
        WHEN salaryMin < 180000 THEN '150–180 тыс.'
        WHEN salaryMin < 220000 THEN '180–220 тыс.'
        ELSE 'Свыше 220 тыс.'
      END AS label,
      COUNT(*) AS count
     FROM vacancies
     WHERE status != 'archived'
     GROUP BY label
     ORDER BY count DESC`,
  );
  const topCompanies = queryRows<{ label: string; count: number }>(
    db,
    `SELECT company AS label, COUNT(*) AS count
     FROM vacancies
     WHERE status != 'archived'
     GROUP BY company
     ORDER BY count DESC, company ASC
     LIMIT 6`,
  );
  const sourcePerformance = queryRows<{ sourceName: string; successRate: number; responseTimeMs: number }>(
    db,
    "SELECT name AS sourceName, successRate, responseTimeMs FROM sources ORDER BY successRate DESC, responseTimeMs ASC",
  );

  return { vacancyTimeline, specialtyDistribution, regionDistribution, salaryBands, topCompanies, sourcePerformance };
}

export async function getLogs() {
  const db = await getDatabase();
  return queryRows<Record<string, unknown>>(
    db,
    "SELECT * FROM system_logs ORDER BY datetime(createdAt) DESC LIMIT 60",
  ).map(mapLog);
}

export async function runMonitoring(options: MonitoringRunOptions = {}) {
  const { initialSeed = false, trigger = initialSeed ? "seed" : "manual", ruleId = null, actor = "system" } = options;
  const db = await getDatabase();
  const runNumber = updateRunCount(db);
  const timestamp = new Date().toISOString();
  let hhSourceId: number | null = null;

  demoTemplates.forEach((_, index) => {
    const variant = createVariant(index, runNumber);
    const sourceId = getSourceIdBySpecialty(db, variant.specialty);
    const ruleIds = getRuleIdsBySpecialty(db, variant.specialty);
    const sourceRow = queryRows<{ name: string; baseUrl: string }>(db, "SELECT name, baseUrl FROM sources WHERE id = ?", [sourceId])[0];
    const existingRow = queryRows<Record<string, unknown>>(
      db,
      "SELECT * FROM vacancies WHERE sourceId = ? AND externalId = ?",
      [sourceId, variant.externalId],
    )[0];

    if (!existingRow) {
      runStatement(
        db,
        `INSERT INTO vacancies (
          externalId, title, company, location, specialty, salaryText, salaryMin, salaryMax,
          employmentType, sourceId, sourceName, sourceUrl, summary, description, publishedAt,
          firstSeenAt, lastSeenAt, status, matchedRuleIds
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          variant.externalId,
          variant.title,
          variant.company,
          variant.location,
          variant.specialty,
          variant.salaryText,
          variant.salaryMin,
          variant.salaryMax,
          variant.employmentType,
          sourceId,
          sourceRow?.name ?? "Источник",
          sourceRow?.baseUrl ?? "",
          variant.summary,
          variant.description,
          createPublishedDate(index + runNumber),
          timestamp,
          timestamp,
          "new",
          JSON.stringify(ruleIds),
        ],
      );

      const vacancyId = getScalarNumber(db, "SELECT last_insert_rowid() AS value");
      runStatement(
        db,
        "INSERT INTO vacancy_history (vacancyId, changedAt, fieldName, oldValue, newValue) VALUES (?, ?, ?, ?, ?)",
        [vacancyId, timestamp, "status", null, "new"],
      );
      return;
    }

    const existing = mapVacancy(existingRow);
    const hasSalaryChanged = existing.salaryMin !== variant.salaryMin || existing.salaryMax !== variant.salaryMax;
    const newStatus = hasSalaryChanged ? "updated" : initialSeed ? "new" : "unchanged";

    runStatement(
      db,
      `UPDATE vacancies
       SET title = ?, company = ?, location = ?, specialty = ?, salaryText = ?, salaryMin = ?, salaryMax = ?,
           employmentType = ?, summary = ?, description = ?, publishedAt = ?, lastSeenAt = ?, status = ?, matchedRuleIds = ?
       WHERE id = ?`,
      [
        variant.title,
        variant.company,
        variant.location,
        variant.specialty,
        variant.salaryText,
        variant.salaryMin,
        variant.salaryMax,
        variant.employmentType,
        variant.summary,
        variant.description,
        createPublishedDate(index + runNumber),
        timestamp,
        newStatus,
        JSON.stringify(ruleIds),
        existing.id,
      ],
    );

    if (hasSalaryChanged) {
      runStatement(
        db,
        "INSERT INTO vacancy_history (vacancyId, changedAt, fieldName, oldValue, newValue) VALUES (?, ?, ?, ?, ?)",
        [existing.id, timestamp, "salaryText", existing.salaryText, variant.salaryText],
      );
    }
  });

  if (process.env.NODE_ENV !== "test") {
    const currentHhSourceId = getOrCreateHhSource(db);
    hhSourceId = currentHhSourceId;

    try {
      const hhVacancies = await fetchHhVacancies();
      hhVacancies.forEach((vacancy) => upsertVacancy(db, currentHhSourceId, "hh.ru", vacancy, timestamp, initialSeed));
      runStatement(db, "UPDATE sources SET lastCheckedAt = ?, status = 'active', successRate = 95 WHERE id = ?", [
        timestamp,
        currentHhSourceId,
      ]);
      insertLog(db, "info", "hh.ru обновлён", `Загружено вакансий: ${hhVacancies.length}.`, "system");
    } catch {
      runStatement(db, "UPDATE sources SET lastCheckedAt = ?, status = 'error', successRate = 0 WHERE id = ?", [
        timestamp,
        currentHhSourceId,
      ]);
      insertLog(db, "warning", "hh.ru недоступен", "Не удалось загрузить вакансии из внешнего источника.", "system");
    }
  }

  if (runNumber > 2) {
    const archiveTarget = queryRows<{ id: number }>(
      db,
      "SELECT id FROM vacancies WHERE externalId = ? ORDER BY id LIMIT 1",
      ["sa-202"],
    )[0];

    if (archiveTarget) {
      runStatement(db, "UPDATE vacancies SET status = 'archived', lastSeenAt = ? WHERE id = ?", [timestamp, archiveTarget.id]);
    }
  }

  if (hhSourceId) {
    runStatement(db, "UPDATE sources SET lastCheckedAt = ?, status = 'active' WHERE id != ?", [timestamp, hhSourceId]);
  } else {
    runStatement(db, "UPDATE sources SET lastCheckedAt = ?, status = 'active'", [timestamp]);
  }
  setMetaValue(db, "lastMonitoringRunAt", timestamp);

  if (ruleId) {
    runStatement(db, "UPDATE monitoring_rules SET lastTriggeredAt = ? WHERE id = ?", [timestamp, ruleId]);
  }

  if (initialSeed) {
    await ensureStarterCollection(db);
  }

  const title =
    trigger === "schedule" ? "Плановый мониторинг выполнен" : initialSeed ? "Первичное наполнение завершено" : "Мониторинг выполнен";
  const description =
    trigger === "schedule"
      ? `Сработал плановый запуск по правилу #${ruleId ?? "—"}, контур обновил карточки вакансий и диагностику источников.`
      : initialSeed
        ? "Система создала начальный набор вакансий, историю изменений и стартовую подборку."
        : `Выполнен цикл мониторинга #${runNumber}, обновлены карточки вакансий и показатели источников.`;

  insertLog(db, "info", title, description, actor);
  await persistDatabase();

  return {
    runNumber,
    updatedAt: timestamp,
    totalVacancies: getScalarNumber(db, "SELECT COUNT(*) AS value FROM vacancies"),
  };
}
