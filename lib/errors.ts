export const ERROR_CODES = {
  MISSING_URL: "missing_url",
  INVALID_URL: "invalid_url",
  UNKNOWN_ACTION: "unknown_action",
  ARTICLE_FETCH_FAILED: "article_fetch_failed",
  ARTICLE_CONTENT_EMPTY: "article_content_empty",
  AI_TIMEOUT: "ai_timeout",
  AI_FAILED: "ai_failed",
  AI_UNAVAILABLE: "ai_unavailable",
  NETWORK: "network",
  UNKNOWN: "unknown",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export type AppErrorPayload = {
  code: ErrorCode;
  title: string;
  message: string;
};

export const ERROR_CATALOG: Record<ErrorCode, AppErrorPayload> = {
  [ERROR_CODES.MISSING_URL]: {
    code: ERROR_CODES.MISSING_URL,
    title: "Нужна ссылка",
    message: "Укажите URL статьи.",
  },
  [ERROR_CODES.INVALID_URL]: {
    code: ERROR_CODES.INVALID_URL,
    title: "Некорректная ссылка",
    message: "Проверьте адрес — он должен начинаться с http:// или https://.",
  },
  [ERROR_CODES.UNKNOWN_ACTION]: {
    code: ERROR_CODES.UNKNOWN_ACTION,
    title: "Неизвестное действие",
    message: "Выберите одну из доступных кнопок.",
  },
  [ERROR_CODES.ARTICLE_FETCH_FAILED]: {
    code: ERROR_CODES.ARTICLE_FETCH_FAILED,
    title: "Статья недоступна",
    message: "Не удалось загрузить статью по этой ссылке.",
  },
  [ERROR_CODES.ARTICLE_CONTENT_EMPTY]: {
    code: ERROR_CODES.ARTICLE_CONTENT_EMPTY,
    title: "Текст не найден",
    message:
      "Не удалось извлечь текст статьи. Возможно, сайт закрыт подпиской или использует нестандартную вёрстку.",
  },
  [ERROR_CODES.AI_TIMEOUT]: {
    code: ERROR_CODES.AI_TIMEOUT,
    title: "Долго ждём ответ",
    message: "Превышено время ожидания. Попробуйте ещё раз или выберите более короткую статью.",
  },
  [ERROR_CODES.AI_FAILED]: {
    code: ERROR_CODES.AI_FAILED,
    title: "Ошибка генерации",
    message: "Не удалось сгенерировать текст. Попробуйте повторить запрос через минуту.",
  },
  [ERROR_CODES.AI_UNAVAILABLE]: {
    code: ERROR_CODES.AI_UNAVAILABLE,
    title: "Сервис недоступен",
    message: "Сервис генерации временно недоступен. Попробуйте позже.",
  },
  [ERROR_CODES.NETWORK]: {
    code: ERROR_CODES.NETWORK,
    title: "Проблема с сетью",
    message: "Не удалось связаться с сервером. Проверьте подключение и попробуйте снова.",
  },
  [ERROR_CODES.UNKNOWN]: {
    code: ERROR_CODES.UNKNOWN,
    title: "Что-то пошло не так",
    message: "Не удалось обработать статью. Попробуйте ещё раз.",
  },
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;

  constructor(code: ErrorCode, httpStatus?: number) {
    const payload = ERROR_CATALOG[code];
    super(payload.message);
    this.name = "AppError";
    this.code = code;
    this.httpStatus = httpStatus ?? getDefaultHttpStatus(code);
  }
}

function getDefaultHttpStatus(code: ErrorCode): number {
  switch (code) {
    case ERROR_CODES.MISSING_URL:
    case ERROR_CODES.INVALID_URL:
    case ERROR_CODES.UNKNOWN_ACTION:
      return 400;
    case ERROR_CODES.ARTICLE_FETCH_FAILED:
      return 502;
    case ERROR_CODES.ARTICLE_CONTENT_EMPTY:
      return 422;
    case ERROR_CODES.AI_TIMEOUT:
      return 504;
    case ERROR_CODES.AI_UNAVAILABLE:
      return 503;
    case ERROR_CODES.NETWORK:
      return 503;
    default:
      return 422;
  }
}

export function getErrorPayload(code: ErrorCode): AppErrorPayload {
  return ERROR_CATALOG[code];
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (!(error instanceof Error)) {
    return new AppError(ERROR_CODES.UNKNOWN);
  }

  const message = error.message.toLowerCase();

  if (error.name === "AbortError" || message.includes("timeout") || message.includes("timed out")) {
    if (message.includes("openrouter") || message.includes("ai")) {
      return new AppError(ERROR_CODES.AI_TIMEOUT);
    }
    return new AppError(ERROR_CODES.ARTICLE_FETCH_FAILED);
  }

  if (message.includes("fetch failed") || message.includes("network") || message.includes("econnrefused")) {
    if (message.includes("openrouter")) {
      return new AppError(ERROR_CODES.AI_FAILED);
    }
    return new AppError(ERROR_CODES.ARTICLE_FETCH_FAILED);
  }

  if (message.includes("openrouter") || message.includes("api key")) {
    return new AppError(ERROR_CODES.AI_UNAVAILABLE);
  }

  return new AppError(ERROR_CODES.UNKNOWN);
}

export function createErrorResponse(error: unknown): {
  body: { error: AppErrorPayload };
  status: number;
} {
  const appError = toAppError(error);

  return {
    body: { error: getErrorPayload(appError.code) },
    status: appError.httpStatus,
  };
}

/** @deprecated Используйте getErrorPayload на клиенте */
export function formatUserError(error: unknown): string {
  return toAppError(error).message;
}
