export function formatUserError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Ошибка при обработке статьи";
  }

  const message = error.message.toLowerCase();

  if (
    error.name === "AbortError" ||
    message.includes("terminated") ||
    message.includes("aborted") ||
    message.includes("timeout") ||
    message.includes("timed out")
  ) {
    return "Превышено время ожидания. Попробуйте ещё раз или выберите более короткую статью.";
  }

  if (message.includes("fetch failed") || message.includes("network")) {
    return "Ошибка сети. Проверьте подключение и попробуйте снова.";
  }

  return error.message;
}
