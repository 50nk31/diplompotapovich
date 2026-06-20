import type { RuleRecord } from "../types";
import { formatDate } from "../utils";

export function renderRules(rules: RuleRecord[]) {
  return `
    <section class="page-intro">
      <div>
        <p class="eyebrow">Правила мониторинга</p>
        <h1>Профили отслеживания по специальностям и регионам</h1>
      </div>
      <div class="intro-note">${rules.filter((rule) => rule.isActive).length} активных правил</div>
    </section>

    <section class="content-grid">
      <article class="panel">
        <div class="panel-head">
          <h2>Список правил</h2>
          <span class="panel-meta">Условия поиска и графики запуска</span>
        </div>
        <div class="list-stack">
          ${rules
            .map(
              (rule) => `
                <article class="rule-card">
                  <div class="rule-head">
                    <div>
                      <strong>${rule.name}</strong>
                      <p>${rule.specialty}</p>
                    </div>
                    <span class="status-pill status-${rule.isActive ? "new" : "archived"}">${rule.isActive ? "Активно" : "Выключено"}</span>
                  </div>
                  <p><strong>Регионы:</strong> ${rule.regions.join(", ") || "Все"}</p>
                  <p><strong>Ключевые слова:</strong> ${rule.keywords.join(", ") || "Не заданы"}</p>
                  <p><strong>Исключения:</strong> ${rule.exclusions.join(", ") || "Нет"}</p>
                  <p><strong>Cron:</strong> ${rule.scheduleCron}</p>
                  <p><strong>Последний запуск:</strong> ${formatDate(rule.lastTriggeredAt)}</p>
                  <div class="button-row">
                    <button
                      class="button"
                      type="button"
                      data-toggle-rule="${rule.id}"
                    >
                      ${rule.isActive ? "Остановить правило" : "Включить правило"}
                    </button>
                  </div>
                </article>
              `,
            )
            .join("")}
        </div>
      </article>

      <article class="panel">
        <div class="panel-head">
          <h2>Новое правило</h2>
          <span class="panel-meta">Быстрое добавление</span>
        </div>
        <form id="rule-form" class="stack-form">
          <label>
            <span>Название</span>
            <input type="text" name="name" required placeholder="Например, Аналитика по Data-профилям" />
          </label>
          <label>
            <span>Специальность</span>
            <input type="text" name="specialty" required placeholder="Например, Data-аналитика" />
          </label>
          <label>
            <span>Ключевые слова</span>
            <input type="text" name="keywords" placeholder="sql, python, bi" />
          </label>
          <label>
            <span>Исключения</span>
            <input type="text" name="exclusions" placeholder="стажировка, junior" />
          </label>
          <label>
            <span>Регионы</span>
            <input type="text" name="regions" placeholder="Москва, Санкт-Петербург" />
          </label>
          <label>
            <span>Расписание cron</span>
            <input type="text" name="scheduleCron" value="0 */6 * * *" required />
          </label>
          <label class="checkbox-row">
            <input type="checkbox" name="isActive" checked />
            <span>Сразу включить правило</span>
          </label>
          <button class="button button-accent" type="submit">Сохранить правило</button>
        </form>
      </article>
    </section>
  `;
}
