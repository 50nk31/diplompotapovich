import type { VacancyHistoryRecord, VacancyRecord, VacanciesPayload } from "../types";
import { formatDate, getStatusLabel } from "../utils";

export function renderVacancies(
  data: VacanciesPayload,
  selectedVacancy: VacancyRecord | null,
  history: VacancyHistoryRecord[],
  filters: { search: string; specialty: string; location: string; status: string },
) {
  return `
    <section class="page-intro">
      <div>
        <p class="eyebrow">Каталог вакансий</p>
        <h1>Нормализованный поток по специальностям и регионам</h1>
      </div>
      <div class="intro-note">Всего в выдаче: ${data.items.length}</div>
    </section>

    <section class="panel">
      <form class="filters-grid" id="vacancy-filters">
        <label>
          <span>Поиск</span>
          <input type="text" name="search" value="${filters.search}" placeholder="Должность, компания или описание" />
        </label>
        <label>
          <span>Специальность</span>
          <select name="specialty">
            <option value="">Все направления</option>
            ${data.specialties
              .map((item) => `<option value="${item}" ${filters.specialty === item ? "selected" : ""}>${item}</option>`)
              .join("")}
          </select>
        </label>
        <label>
          <span>Регион</span>
          <select name="location">
            <option value="">Все регионы</option>
            ${data.locations
              .map((item) => `<option value="${item}" ${filters.location === item ? "selected" : ""}>${item}</option>`)
              .join("")}
          </select>
        </label>
        <label>
          <span>Статус</span>
          <select name="status">
            <option value="">Все статусы</option>
            ${data.statuses
              .map(
                (item) =>
                  `<option value="${item}" ${filters.status === item ? "selected" : ""}>${getStatusLabel(item)}</option>`,
              )
              .join("")}
          </select>
        </label>
        <button class="button" type="submit">Применить</button>
      </form>
    </section>

    <section class="split-layout">
      <article class="panel panel-table">
        <div class="panel-head">
          <h2>Список вакансий</h2>
          <span class="panel-meta">Плотный режим просмотра</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Позиция</th>
                <th>Компания</th>
                <th>Регион</th>
                <th>Оплата</th>
                <th>Статус</th>
                <th>Обновлено</th>
              </tr>
            </thead>
            <tbody>
              ${data.items
                .map(
                  (vacancy) => `
                    <tr class="${selectedVacancy?.id === vacancy.id ? "row-selected" : ""}" data-select-vacancy="${vacancy.id}">
                      <td>
                        <strong>${vacancy.title}</strong>
                        <small>${vacancy.specialty}</small>
                      </td>
                      <td>${vacancy.company}</td>
                      <td>${vacancy.location}</td>
                      <td>${vacancy.salaryText ?? "Не указано"}</td>
                      <td><span class="status-pill status-${vacancy.status}">${getStatusLabel(vacancy.status)}</span></td>
                      <td>${formatDate(vacancy.lastSeenAt)}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </article>

      <aside class="panel panel-side">
        ${
          selectedVacancy
            ? `
              <div class="panel-head">
                <h2>${selectedVacancy.title}</h2>
                <span class="status-pill status-${selectedVacancy.status}">${getStatusLabel(selectedVacancy.status)}</span>
              </div>
              <div class="detail-stack">
                <p><strong>${selectedVacancy.company}</strong> · ${selectedVacancy.location}</p>
                <p>${selectedVacancy.summary}</p>
                <dl class="detail-list">
                  <div><dt>Источник</dt><dd>${selectedVacancy.sourceName}</dd></div>
                  <div><dt>Оплата</dt><dd>${selectedVacancy.salaryText ?? "Не указано"}</dd></div>
                  <div><dt>Тип занятости</dt><dd>${selectedVacancy.employmentType ?? "Не указано"}</dd></div>
                  <div><dt>Опубликовано</dt><dd>${formatDate(selectedVacancy.publishedAt)}</dd></div>
                </dl>
                <p class="muted">${selectedVacancy.description}</p>
                <div class="subsection">
                  <h3>История изменений</h3>
                  <div class="list-stack">
                    ${
                      history.length > 0
                        ? history
                            .map(
                              (item) => `
                                <div class="history-row">
                                  <strong>${item.fieldName}</strong>
                                  <p>${item.oldValue ?? "—"} → ${item.newValue ?? "—"}</p>
                                  <small>${formatDate(item.changedAt)}</small>
                                </div>
                              `,
                            )
                            .join("")
                        : `<p class="muted">Изменения еще не зафиксированы.</p>`
                    }
                  </div>
                </div>
              </div>
            `
            : `<div class="empty-state"><h2>Карточка вакансии</h2><p>Выберите строку в таблице, чтобы открыть детали и историю изменений.</p></div>`
        }
      </aside>
    </section>
  `;
}
