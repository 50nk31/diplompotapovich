import type { LogRecord } from "../types";
import { formatDate, getLogLabel } from "../utils";

export function renderLogs(logs: LogRecord[]) {
  return `
    <section class="page-intro">
      <div>
        <p class="eyebrow">Журнал событий</p>
        <h1>Техническая и операционная история системы</h1>
      </div>
      <div class="intro-note">Последние ${logs.length} записей</div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <h2>События</h2>
        <span class="panel-meta">Диагностика и действия пользователей</span>
      </div>
      <div class="log-table">
        ${logs
          .map(
            (log) => `
              <div class="timeline-row">
                <span class="timeline-badge timeline-${log.level}">${getLogLabel(log.level)}</span>
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
