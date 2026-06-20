import type { SourceRecord } from "../types";
import { formatDate, getStatusLabel } from "../utils";

export function renderSources(sources: SourceRecord[]) {
  return `
    <section class="page-intro">
      <div>
        <p class="eyebrow">Источники данных</p>
        <h1>Управление площадками и контроль стабильности обхода</h1>
      </div>
      <div class="intro-note">${sources.length} источников в контуре</div>
    </section>

    <section class="content-grid">
      <article class="panel">
        <div class="panel-head">
          <h2>Реестр источников</h2>
          <span class="panel-meta">Техническое состояние</span>
        </div>
        <div class="card-grid">
          ${sources
            .map(
              (source) => `
                <article class="source-card">
                  <div class="rule-head">
                    <div>
                      <strong>${source.name}</strong>
                      <p>${source.specialty}</p>
                    </div>
                    <span class="status-pill status-${source.status}">${getStatusLabel(source.status)}</span>
                  </div>
                  <p><strong>Регион:</strong> ${source.region}</p>
                  <p><strong>URL:</strong> ${source.baseUrl}</p>
                  <p><strong>Успешность:</strong> ${source.successRate}%</p>
                  <p><strong>Ответ:</strong> ${source.responseTimeMs} мс</p>
                  <p><strong>Последняя проверка:</strong> ${formatDate(source.lastCheckedAt)}</p>
                </article>
              `,
            )
            .join("")}
        </div>
      </article>

      <article class="panel">
        <div class="panel-head">
          <h2>Добавить источник</h2>
          <span class="panel-meta">Ручная регистрация</span>
        </div>
        <form id="source-form" class="stack-form">
          <label>
            <span>Название</span>
            <input type="text" name="name" required placeholder="Например, Central Jobs" />
          </label>
          <label>
            <span>Базовый URL</span>
            <input type="url" name="baseUrl" required placeholder="https://source.example/jobs" />
          </label>
          <label>
            <span>Специальность</span>
            <input type="text" name="specialty" required placeholder="Например, Backend-разработка" />
          </label>
          <label>
            <span>Регион</span>
            <input type="text" name="region" required placeholder="Например, Новосибирск" />
          </label>
          <label>
            <span>Успешность</span>
            <input type="number" name="successRate" min="0" max="100" value="90" required />
          </label>
          <label>
            <span>Время ответа, мс</span>
            <input type="number" name="responseTimeMs" min="50" value="950" required />
          </label>
          <label>
            <span>Статус</span>
            <select name="status">
              <option value="active">Активен</option>
              <option value="paused">Пауза</option>
              <option value="error">Ошибка</option>
            </select>
          </label>
          <button class="button" type="submit">Добавить источник</button>
        </form>
      </article>
    </section>
  `;
}
