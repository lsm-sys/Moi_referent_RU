export type ActionType = "summary" | "dzen" | "telegram" | "illustration";

export type ResultType = "text" | "image";

export const ACTION_LABELS: Record<ActionType, string> = {
  summary: "О чем статья?",
  dzen: "Пост для Дзен",
  telegram: "Пост для Telegram",
  illustration: "Иллюстрация",
};

export const ACTION_DESCRIPTIONS: Record<ActionType, string> = {
  summary: "Краткое содержание на русском",
  dzen: "Текст для публикации в Дзен",
  telegram: "Текст для публикации в Telegram",
  illustration: "Изображение по теме статьи",
};

export const ACTION_LOADING_LABELS: Record<ActionType, string> = {
  summary: "Готовлю краткое содержание...",
  dzen: "Готовлю пост для Дзен...",
  telegram: "Готовлю пост для Telegram...",
  illustration: "Создаю промпт и генерирую иллюстрацию...",
};

export const ACTIONS: { id: ActionType; label: string; description: string }[] = (
  Object.keys(ACTION_LABELS) as ActionType[]
).map((id) => ({
  id,
  label: ACTION_LABELS[id],
  description: ACTION_DESCRIPTIONS[id],
}));
