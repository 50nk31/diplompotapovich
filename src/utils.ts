export function formatDate(value: string | null) {
  if (!value) {
    return "Нет данных";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function getStatusLabel(status: string) {
  switch (status) {
    case "new":
      return "Новая";
    case "updated":
      return "Обновлена";
    case "unchanged":
      return "Без изменений";
    case "archived":
      return "Архив";
    case "active":
      return "Активен";
    case "paused":
      return "Пауза";
    case "error":
      return "Ошибка";
    default:
      return status;
  }
}

export function getLogLabel(level: string) {
  switch (level) {
    case "info":
      return "Инфо";
    case "warning":
      return "Внимание";
    case "error":
      return "Ошибка";
    default:
      return level;
  }
}

export function splitCommaValues(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
