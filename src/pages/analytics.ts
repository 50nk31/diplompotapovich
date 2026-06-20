import type { AnalyticsPayload } from "../types";

export function renderAnalytics(data: AnalyticsPayload) {
  return `
    <section class="page-intro">
      <div>
        <p class="eyebrow">Аналитика</p>
        <h1>Динамика вакансий, специализаций и качества источников</h1>
      </div>
      <div class="intro-note">Сводные графики по текущему состоянию</div>
    </section>

    <section class="analytics-grid">
      <article class="panel">
        <div class="panel-head">
          <h2>Динамика поступления</h2>
          <span class="panel-meta">Новые карточки по дням</span>
        </div>
        <canvas id="timeline-chart"></canvas>
      </article>
      <article class="panel">
        <div class="panel-head">
          <h2>Распределение специальностей</h2>
          <span class="panel-meta">Активная выборка</span>
        </div>
        <canvas id="specialty-chart"></canvas>
      </article>
      <article class="panel">
        <div class="panel-head">
          <h2>Регионы с наибольшей активностью</h2>
          <span class="panel-meta">Текущая география потока</span>
        </div>
        <div class="list-stack compact-list">
          ${data.regionDistribution
            .map(
              (point) => `
                <div class="history-row">
                  <strong>${point.label}</strong>
                  <p>${point.count} позиций в активной выборке</p>
                </div>
              `,
            )
            .join("")}
        </div>
      </article>
      <article class="panel">
        <div class="panel-head">
          <h2>Компании-лидеры</h2>
          <span class="panel-meta">Частота появления</span>
        </div>
        <canvas id="companies-chart"></canvas>
      </article>
      <article class="panel">
        <div class="panel-head">
          <h2>Источники и скорость отклика</h2>
          <span class="panel-meta">Сравнение качества</span>
        </div>
        <canvas id="sources-chart"></canvas>
      </article>
      <article class="panel">
        <div class="panel-head">
          <h2>Диапазоны оплаты</h2>
          <span class="panel-meta">Распределение по нижней границе</span>
        </div>
        <div class="list-stack compact-list">
          ${data.salaryBands
            .map(
              (point) => `
                <div class="history-row">
                  <strong>${point.label}</strong>
                  <p>${point.count} вакансий попадают в этот диапазон</p>
                </div>
              `,
            )
            .join("")}
        </div>
      </article>
    </section>
  `;
}
