import type { CollectionDetails, CollectionFilters, CollectionRecord } from "../types";
import { formatDate, getStatusLabel } from "../utils";

export function renderCollections(
  collections: CollectionRecord[],
  selectedCollection: CollectionDetails | null,
  currentFilters: CollectionFilters,
) {
  return `
    <section class="page-intro">
      <div>
        <p class="eyebrow">Подборки</p>
        <h1>Сохранённые выборки для анализа и повторного просмотра</h1>
      </div>
      <div class="intro-note">${collections.length} подборок в рабочем контуре</div>
    </section>

    <section class="content-grid">
      <article class="panel">
        <div class="panel-head">
          <h2>Список подборок</h2>
          <span class="panel-meta">Ручные и тематические выборки</span>
        </div>
        <div class="list-stack">
          ${collections
            .map(
              (collection) => `
                <button
                  class="list-row list-row-button ${selectedCollection?.id === collection.id ? "row-selected" : ""}"
                  type="button"
                  data-select-collection="${collection.id}"
                >
                  <div>
                    <strong>${collection.name}</strong>
                    <p>${collection.description}</p>
                  </div>
                  <div class="row-tail">
                    <span>${collection.itemsCount} поз.</span>
                    <small>${formatDate(collection.updatedAt)}</small>
                  </div>
                </button>
              `,
            )
            .join("")}
        </div>
      </article>

      <article class="panel">
        <div class="panel-head">
          <h2>Новая подборка</h2>
          <span class="panel-meta">Фильтры можно задать сразу</span>
        </div>
        <form id="collection-form" class="stack-form">
          <label>
            <span>Название</span>
            <input type="text" name="name" required placeholder="Например, Региональные backend-позиции" />
          </label>
          <label>
            <span>Описание</span>
            <input type="text" name="description" required placeholder="Коротко о назначении подборки" />
          </label>
          <label>
            <span>Поиск</span>
            <input type="text" name="search" value="${currentFilters.search}" placeholder="Ключевые слова или компания" />
          </label>
          <label>
            <span>Специальность</span>
            <input type="text" name="specialty" value="${currentFilters.specialty}" placeholder="Например, Data-аналитика" />
          </label>
          <label>
            <span>Регион</span>
            <input type="text" name="location" value="${currentFilters.location}" placeholder="Например, Москва" />
          </label>
          <label>
            <span>Статус</span>
            <select name="status">
              <option value="" ${currentFilters.status === "" ? "selected" : ""}>Все статусы</option>
              <option value="new" ${currentFilters.status === "new" ? "selected" : ""}>Новая</option>
              <option value="updated" ${currentFilters.status === "updated" ? "selected" : ""}>Обновлена</option>
              <option value="unchanged" ${currentFilters.status === "unchanged" ? "selected" : ""}>Без изменений</option>
              <option value="archived" ${currentFilters.status === "archived" ? "selected" : ""}>Архив</option>
            </select>
          </label>
          <button class="button button-accent" type="submit">Создать подборку</button>
        </form>
      </article>
    </section>

    <section class="panel">
      ${
        selectedCollection
          ? `
            <div class="panel-head">
              <div>
                <h2>${selectedCollection.name}</h2>
                <p class="panel-meta">${selectedCollection.description}</p>
              </div>
              <span class="panel-meta">Обновлено: ${formatDate(selectedCollection.updatedAt)}</span>
            </div>
            <div class="detail-list">
              <div><dt>Фильтр поиска</dt><dd>${selectedCollection.filters.search || "Не задан"}</dd></div>
              <div><dt>Специальность</dt><dd>${selectedCollection.filters.specialty || "Все направления"}</dd></div>
              <div><dt>Регион</dt><dd>${selectedCollection.filters.location || "Все регионы"}</dd></div>
              <div><dt>Статус</dt><dd>${selectedCollection.filters.status ? getStatusLabel(selectedCollection.filters.status) : "Все статусы"}</dd></div>
            </div>
            <div class="subsection">
              <h3>Состав подборки</h3>
              <div class="list-stack">
                ${
                  selectedCollection.items.length > 0
                    ? selectedCollection.items
                        .map(
                          (item) => `
                            <div class="history-row">
                              <div class="row-main">
                                <strong>${item.vacancy.title}</strong>
                                <p>${item.vacancy.company} · ${item.vacancy.location}</p>
                                <p>${item.vacancy.salaryText ?? "Оплата не указана"}</p>
                                ${item.note ? `<small>${item.note}</small>` : ""}
                              </div>
                              <div class="row-tail">
                                <span class="status-pill status-${item.vacancy.status}">${getStatusLabel(item.vacancy.status)}</span>
                                <small>${formatDate(item.addedAt)}</small>
                                <button
                                  class="button"
                                  type="button"
                                  data-remove-collection-item="${item.vacancyId}"
                                >
                                  Удалить
                                </button>
                              </div>
                            </div>
                          `,
                        )
                        .join("")
                    : `<div class="empty-state"><p>Подборка пока пуста. Добавьте вакансии со страницы каталога.</p></div>`
                }
              </div>
            </div>
          `
          : `<div class="empty-state"><p>Выберите подборку слева, чтобы посмотреть состав и параметры.</p></div>`
      }
    </section>
  `;
}
