import "./styles.css";

import { Chart, type ChartConfiguration, registerables } from "chart.js";

import {
  addVacancyToCollection,
  createCollection,
  createRule,
  createSource,
  getAnalytics,
  getCollectionDetails,
  getCollections,
  getDashboard,
  getLogs,
  getRules,
  getSources,
  getVacancies,
  getVacancyDetails,
  removeVacancyFromCollection,
  runMonitoring,
  updateRule,
  updateSource,
} from "./api";
import { renderAnalytics } from "./pages/analytics";
import { renderCollections } from "./pages/collections";
import { renderDashboard } from "./pages/dashboard";
import { renderLogs } from "./pages/logs";
import { renderRules } from "./pages/rules";
import { renderSources } from "./pages/sources";
import { renderVacancies } from "./pages/vacancies";
import type {
  AnalyticsPayload,
  CollectionDetails,
  CollectionRecord,
  DashboardPayload,
  LogRecord,
  RuleRecord,
  SourceRecord,
  VacancyHistoryRecord,
  VacancyRecord,
  VacanciesPayload,
} from "./types";
import { splitCommaValues } from "./utils";

Chart.register(...registerables);

type RouteKey = "/" | "/vacancies" | "/rules" | "/sources" | "/analytics" | "/logs" | "/collections";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Контейнер приложения не найден");
}

const appRoot: HTMLDivElement = app;

const routeTitles: Record<RouteKey, string> = {
  "/": "Панель мониторинга",
  "/vacancies": "Каталог вакансий",
  "/rules": "Правила мониторинга",
  "/sources": "Источники данных",
  "/analytics": "Аналитика",
  "/logs": "Журнал событий",
  "/collections": "Подборки",
};

const state: {
  route: RouteKey;
  dashboard: DashboardPayload | null;
  vacancies: VacanciesPayload | null;
  selectedVacancy: VacancyRecord | null;
  vacancyHistory: VacancyHistoryRecord[];
  rules: RuleRecord[];
  sources: SourceRecord[];
  analytics: AnalyticsPayload | null;
  logs: LogRecord[];
  collections: CollectionRecord[];
  selectedCollection: CollectionDetails | null;
  filters: { search: string; specialty: string; location: string; status: string };
  message: string;
} = {
  route: normalizeRoute(window.location.pathname),
  dashboard: null,
  vacancies: null,
  selectedVacancy: null,
  vacancyHistory: [],
  rules: [],
  sources: [],
  analytics: null,
  logs: [],
  collections: [],
  selectedCollection: null,
  filters: { search: "", specialty: "", location: "", status: "" },
  message: "",
};

const charts = new Map<string, Chart>();

function normalizeRoute(pathname: string): RouteKey {
  return ["/", "/vacancies", "/rules", "/sources", "/analytics", "/logs", "/collections"].includes(pathname)
    ? (pathname as RouteKey)
    : "/";
}

function navigate(route: RouteKey) {
  state.route = route;
  window.history.pushState({}, "", route);
  void loadAndRender();
}

function renderShell(content: string) {
  appRoot.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand-block">
          <div>
            <p class="eyebrow">Информационная система</p>
            <strong>Мониторинг вакансий</strong>
          </div>
        </div>
        <nav class="nav-stack">
          ${Object.entries(routeTitles)
            .map(
              ([route, title]) => `
                <button class="nav-link ${state.route === route ? "nav-link-active" : ""}" data-route="${route}">
                  ${title}
                </button>
              `,
            )
            .join("")}
        </nav>
        <div class="sidebar-foot">
          <p>Сводка обновляется по расписанию и по ручному запуску.</p>
        </div>
      </aside>
      <main class="main-area">
        <header class="topbar">
          <div>
            <p class="eyebrow">Рабочая зона</p>
            <strong>${routeTitles[state.route]}</strong>
          </div>
          <div class="status-line">
            <span>Контур: локальный</span>
            <span>${new Date().toLocaleString("ru-RU")}</span>
          </div>
        </header>
        ${state.message ? `<div class="flash">${state.message}</div>` : ""}
        ${content}
      </main>
    </div>
  `;

  bindGlobalEvents();
}

function bindGlobalEvents() {
  document.querySelectorAll<HTMLElement>("[data-route]").forEach((button) => {
    button.addEventListener("click", () => navigate(button.dataset.route as RouteKey));
  });

  document.querySelectorAll<HTMLElement>("[data-link]").forEach((button) => {
    button.addEventListener("click", () => {
      const route = button.dataset.link as RouteKey;
      const vacancyId = Number(button.dataset.vacancyId);
      if (vacancyId) {
        void selectVacancy(vacancyId);
      }
      navigate(route);
    });
  });
}

async function selectVacancy(id: number) {
  const details = await getVacancyDetails(id);
  state.selectedVacancy = details.vacancy;
  state.vacancyHistory = details.history;
}

async function refreshCollections(selectedId?: number) {
  state.collections = await getCollections();

  if (state.collections.length === 0) {
    state.selectedCollection = null;
    return;
  }

  const targetId = selectedId ?? state.selectedCollection?.id ?? state.collections[0]?.id;
  if (!targetId) {
    state.selectedCollection = null;
    return;
  }

  state.selectedCollection = await getCollectionDetails(targetId);
}

async function loadRouteData() {
  switch (state.route) {
    case "/":
      state.dashboard = await getDashboard();
      break;
    case "/vacancies": {
      const params = new URLSearchParams();
      Object.entries(state.filters).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        }
      });
      state.vacancies = await getVacancies(params);
      state.collections = await getCollections();
      if (!state.selectedVacancy || !state.vacancies.items.some((item) => item.id === state.selectedVacancy?.id)) {
        state.selectedVacancy = null;
        state.vacancyHistory = [];
      }
      if (!state.selectedVacancy && state.vacancies.items[0]) {
        await selectVacancy(state.vacancies.items[0].id);
      }
      break;
    }
    case "/rules":
      state.rules = await getRules();
      break;
    case "/sources":
      state.sources = await getSources();
      break;
    case "/analytics":
      state.analytics = await getAnalytics();
      break;
    case "/logs":
      state.logs = await getLogs();
      break;
    case "/collections":
      await refreshCollections();
      break;
  }
}

function getPageContent() {
  switch (state.route) {
    case "/":
      return renderDashboard(state.dashboard!);
    case "/vacancies":
      return renderVacancies(state.vacancies!, state.selectedVacancy, state.vacancyHistory, state.filters, state.collections);
    case "/rules":
      return renderRules(state.rules);
    case "/sources":
      return renderSources(state.sources);
    case "/analytics":
      return renderAnalytics(state.analytics!);
    case "/logs":
      return renderLogs(state.logs);
    case "/collections":
      return renderCollections(state.collections, state.selectedCollection, state.filters);
  }
}

function clearCharts() {
  charts.forEach((chart) => chart.destroy());
  charts.clear();
}

function createChart(id: string, config: ChartConfiguration) {
  const canvas = document.getElementById(id) as HTMLCanvasElement | null;
  if (!canvas) {
    return;
  }

  const chart = new Chart(canvas, config);
  charts.set(id, chart);
}

function mountRouteActions() {
  clearCharts();

  document.getElementById("vacancy-filters")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget as HTMLFormElement);
    state.filters = {
      search: String(formData.get("search") ?? ""),
      specialty: String(formData.get("specialty") ?? ""),
      location: String(formData.get("location") ?? ""),
      status: String(formData.get("status") ?? ""),
    };
    await loadAndRender("Фильтры обновлены.");
  });

  document.querySelectorAll<HTMLElement>("[data-select-vacancy]").forEach((row) => {
    row.addEventListener("click", async () => {
      await selectVacancy(Number(row.dataset.selectVacancy));
      renderShell(getPageContent());
      mountRouteActions();
    });
  });

  document.getElementById("rule-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    state.rules = await createRule({
      name: String(formData.get("name") ?? ""),
      specialty: String(formData.get("specialty") ?? ""),
      keywords: splitCommaValues(String(formData.get("keywords") ?? "")),
      exclusions: splitCommaValues(String(formData.get("exclusions") ?? "")),
      regions: splitCommaValues(String(formData.get("regions") ?? "")),
      scheduleCron: String(formData.get("scheduleCron") ?? ""),
      isActive: Boolean(formData.get("isActive")),
    });
    form.reset();
    await loadAndRender("Правило сохранено.");
  });

  document.getElementById("source-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    state.sources = await createSource({
      name: String(formData.get("name") ?? ""),
      baseUrl: String(formData.get("baseUrl") ?? ""),
      specialty: String(formData.get("specialty") ?? ""),
      region: String(formData.get("region") ?? ""),
      status: String(formData.get("status") ?? "active") as SourceRecord["status"],
      successRate: Number(formData.get("successRate") ?? 90),
      responseTimeMs: Number(formData.get("responseTimeMs") ?? 900),
      isDemo: false,
    });
    form.reset();
    await loadAndRender("Источник добавлен.");
  });

  document.getElementById("collection-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    state.collections = await createCollection({
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      filters: {
        search: String(formData.get("search") ?? ""),
        specialty: String(formData.get("specialty") ?? ""),
        location: String(formData.get("location") ?? ""),
        status: String(formData.get("status") ?? ""),
      },
    });

    const newestCollectionId = state.collections[0]?.id;
    if (newestCollectionId) {
      state.selectedCollection = await getCollectionDetails(newestCollectionId);
    }

    form.reset();
    await loadAndRender("Подборка создана.");
  });

  document.getElementById("save-vacancy-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget as HTMLFormElement);
    const collectionId = Number(formData.get("collectionId"));
    const vacancyId = Number(formData.get("vacancyId"));
    const note = String(formData.get("note") ?? "").trim() || null;

    await addVacancyToCollection(collectionId, { vacancyId, note });
    state.collections = await getCollections();
    await loadAndRender("Вакансия сохранена в подборку.");
  });

  document.querySelector("[data-action='run-monitoring']")?.addEventListener("click", async () => {
    const result = await runMonitoring();
    await loadAndRender(`Проверка завершена. Цикл #${result.runNumber}, всего вакансий: ${result.totalVacancies}.`);
  });

  document.querySelectorAll<HTMLElement>("[data-toggle-rule]").forEach((button) => {
    button.addEventListener("click", async () => {
      const rule = state.rules.find((item) => item.id === Number(button.dataset.toggleRule));
      if (!rule) {
        return;
      }

      state.rules = await updateRule(rule.id, {
        name: rule.name,
        specialty: rule.specialty,
        keywords: rule.keywords,
        exclusions: rule.exclusions,
        regions: rule.regions,
        scheduleCron: rule.scheduleCron,
        isActive: !rule.isActive,
      });
      await loadAndRender(rule.isActive ? "Правило остановлено." : "Правило снова активно.");
    });
  });

  document.querySelectorAll<HTMLElement>("[data-toggle-source]").forEach((button) => {
    button.addEventListener("click", async () => {
      const source = state.sources.find((item) => item.id === Number(button.dataset.toggleSource));
      if (!source) {
        return;
      }

      state.sources = await updateSource(source.id, {
        name: source.name,
        baseUrl: source.baseUrl,
        specialty: source.specialty,
        region: source.region,
        status: source.status === "active" ? "paused" : "active",
        successRate: source.successRate,
        responseTimeMs: source.responseTimeMs,
        isDemo: source.isDemo,
      });
      await loadAndRender(source.status === "active" ? "Источник поставлен на паузу." : "Источник снова активен.");
    });
  });

  document.querySelectorAll<HTMLElement>("[data-select-collection]").forEach((button) => {
    button.addEventListener("click", async () => {
      const collectionId = Number(button.dataset.selectCollection);
      state.selectedCollection = await getCollectionDetails(collectionId);
      renderShell(getPageContent());
      mountRouteActions();
    });
  });

  document.querySelectorAll<HTMLElement>("[data-remove-collection-item]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!state.selectedCollection) {
        return;
      }

      await removeVacancyFromCollection(state.selectedCollection.id, Number(button.dataset.removeCollectionItem));
      await refreshCollections(state.selectedCollection.id);
      await loadAndRender("Элемент удалён из подборки.");
    });
  });

  if (state.route === "/analytics" && state.analytics) {
    createChart("timeline-chart", {
      type: "line",
      data: {
        labels: state.analytics.vacancyTimeline.map((point) => point.label),
        datasets: [{ label: "Вакансии", data: state.analytics.vacancyTimeline.map((point) => point.count), borderColor: "#b89a66", backgroundColor: "rgba(184, 154, 102, 0.18)", tension: 0.3, fill: true }],
      },
      options: { responsive: true, maintainAspectRatio: false },
    });

    createChart("specialty-chart", {
      type: "doughnut",
      data: {
        labels: state.analytics.specialtyDistribution.map((point) => point.label),
        datasets: [{ data: state.analytics.specialtyDistribution.map((point) => point.count), backgroundColor: ["#b89a66", "#557caa", "#7b8a6d", "#c1664d"] }],
      },
      options: { responsive: true, maintainAspectRatio: false },
    });

    createChart("companies-chart", {
      type: "bar",
      data: {
        labels: state.analytics.topCompanies.map((point) => point.label),
        datasets: [{ label: "Упоминания", data: state.analytics.topCompanies.map((point) => point.count), backgroundColor: "#557caa" }],
      },
      options: { responsive: true, maintainAspectRatio: false },
    });

    createChart("sources-chart", {
      type: "bar",
      data: {
        labels: state.analytics.sourcePerformance.map((item) => item.sourceName),
        datasets: [
          { label: "Успешность, %", data: state.analytics.sourcePerformance.map((item) => item.successRate), backgroundColor: "#7b8a6d" },
          { label: "Ответ, мс", data: state.analytics.sourcePerformance.map((item) => item.responseTimeMs), backgroundColor: "#b85d3f" },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false },
    });
  }
}

async function loadAndRender(message = "") {
  state.message = message;
  await loadRouteData();
  renderShell(getPageContent());
  mountRouteActions();
}

window.addEventListener("popstate", () => {
  state.route = normalizeRoute(window.location.pathname);
  void loadAndRender();
});

void loadAndRender().catch((error) => {
  renderShell(`<section class="panel"><h1>Ошибка загрузки</h1><p>${error instanceof Error ? error.message : "Не удалось загрузить данные."}</p></section>`);
});
