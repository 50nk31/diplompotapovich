import type { DashboardPayload } from "../types";
import { formatDate, getStatusLabel } from "../utils";

export function renderDashboard(data: DashboardPayload) {
  return `
    <section class="page-intro">
      <div>
        <p class="eyebrow">Оперативная сводка</p>
        <h1>Контур наблюдения за рынком вакансий</h1>
      </div>
      <button class="button button-accent" data-action="run-monitoring">Запустить проверку</button>
    </section>

    <section class="metric-grid">
      ${data.metrics
        .map(
          (metric) => `
            <article class="metric-card">
              <span class="metric-label">${metric.label}</span>
              <strong class="metric-value">${metric.value}</strong>
              <span class="metric-delta">${metric.delta}</span>
            </article>
          `,
        )
        .join("")}
    </section>

    <section class="card-grid">
      <article class="panel">
        <div class="panel-head">
          <h2>Состояние контура</h2>
          <span class="panel-meta">Ключевые параметры работы</span>
        </div>
        <div class="stat-stack">
          <div class="stat-row">
            <span>Активные расписания</span>
            <strong>${data.systemSummary.activeSchedules}</strong>
          </div>
          <div class="stat-row">
            <span>Сохранённые подборки</span>
            <strong>${data.systemSummary.collectionsCount}</strong>
          </div>
          <div class="stat-row">
            <span>Архивные позиции</span>
            <strong>${data.systemSummary.archivedVacancies}</strong>
          </div>
          <div class="stat-row">
            <span>Последний запуск</span>
            <strong>${formatDate(data.systemSummary.lastRunAt)}</strong>
          </div>
        </div>
      </article>

      <article class="panel">
        <div class="panel-head">
          <h2>Режим обработки</h2>
          <span class="panel-meta">Как работает наблюдение</span>
        </div>
        <div class="list-stack compact-list">
          <div class="history-row">
            <strong>Автоматический запуск</strong>
            <p>Каждое активное правило участвует в плановом цикле без ручного вмешательства.</p>
          </div>
          <div class="history-row">
            <strong>Контроль изменений</strong>
            <p>Система фиксирует обновления оплаты, статуса и появления новых карточек.</p>
          </div>
          <div class="history-row">
            <strong>Работа с подборками</strong>
            <p>Релевантные вакансии можно сохранять для повторного просмотра и дальнейшего анализа.</p>
          </div>
        </div>
      </article>
    </section>

    <section class="content-grid">
      <article class="panel">
        <div class="panel-head">
          <h2>Последние изменения</h2>
          <span class="panel-meta">${data.recentVacancies.length} записей</span>
        </div>
        <div class="list-stack">
          ${data.recentVacancies
            .map(
              (vacancy) => `
                <button class="list-row list-row-button" data-link="/vacancies" data-vacancy-id="${vacancy.id}">
                  <div>
                    <strong>${vacancy.title}</strong>
                    <p>${vacancy.company} · ${vacancy.location}</p>
                  </div>
                  <div class="row-tail">
                    <span class="status-pill status-${vacancy.status}">${getStatusLabel(vacancy.status)}</span>
                    <small>${formatDate(vacancy.lastSeenAt)}</small>
                  </div>
                </button>
              `,
            )
            .join("")}
        </div>
      </article>

      <article class="panel">
        <div class="panel-head">
          <h2>Состояние источников</h2>
          <span class="panel-meta">Контроль доступности</span>
        </div>
        <div class="source-stack">
          ${data.activeSources
            .map(
              (source) => `
                <div class="source-row">
                  <div>
                    <strong>${source.name}</strong>
                    <p>${source.specialty} · ${source.region}</p>
                  </div>
                  <div class="source-stats">
                    <span>${source.successRate}%</span>
                    <small>${source.responseTimeMs} мс</small>
                  </div>
                </div>
              `,
            )
            .join("")}
        </div>
      </article>
    </section>

    <section class="panel">
      <div class="panel-head">
        <h2>Журнал активности</h2>
        <span class="panel-meta">Последние системные события</span>
      </div>
      <div class="timeline">
        ${data.recentLogs
          .map(
            (log) => `
              <div class="timeline-row">
                <span class="timeline-badge timeline-${log.level}">${log.level.toUpperCase()}</span>
                <div>
                  <strong>${log.title}</strong>
                  <p>${log.description}</p>
                </div>
                <small>${formatDate(log.createdAt)}</small>
              </div>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}
