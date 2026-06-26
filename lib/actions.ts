export type ActionType = "summary" | "dzen" | "telegram";

export const ACTION_LABELS: Record<ActionType, string> = {
  summary: "О чем статья?",
  dzen: "Пост для Дзен",
  telegram: "Пост для Telegram",
};
