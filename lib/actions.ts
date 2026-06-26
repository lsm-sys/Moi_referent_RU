export type ActionType = "summary" | "dzen" | "telegram" | "translate";

export const ACTION_LABELS: Record<ActionType, string> = {
  summary: "О чем статья?",
  dzen: "Пост для Дзен",
  telegram: "Пост для Telegram",
  translate: "Перевод",
};

export const ACTION_LOADING_LABELS: Record<ActionType, string> = {
  summary: "Парсинг статьи...",
  dzen: "Парсинг статьи...",
  telegram: "Парсинг статьи...",
  translate: "Перевод статьи...",
};
