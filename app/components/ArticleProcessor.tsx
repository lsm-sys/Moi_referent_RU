"use client";

import { useEffect, useRef, useState } from "react";
import { ArticlePreviewCard } from "@/app/components/ArticlePreviewCard";
import { ErrorAlert } from "@/app/components/ErrorAlert";
import {
  ACTION_LOADING_LABELS,
  ACTIONS,
  type ActionType,
  type ResultType,
} from "@/lib/actions";
import type { ArticlePreview } from "@/lib/article-preview";
import {
  ERROR_CODES,
  getErrorPayload,
  type AppErrorPayload,
  type ErrorCode,
} from "@/lib/errors";

type ApiSuccessResponse = {
  result?: string;
  resultType?: ResultType;
  imagePrompt?: string;
  error?: AppErrorPayload;
};

type ParseResponse = {
  preview?: ArticlePreview;
  error?: AppErrorPayload;
};

const PREVIEW_DEBOUNCE_MS = 800;

function resolveClientError(payload?: ApiSuccessResponse, fallbackCode: ErrorCode = ERROR_CODES.UNKNOWN): AppErrorPayload {
  if (payload?.error?.code && payload.error.title && payload.error.message) {
    return payload.error;
  }
  return getErrorPayload(fallbackCode);
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export default function ArticleProcessor() {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<ArticlePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [result, setResult] = useState("");
  const [resultType, setResultType] = useState<ResultType>("text");
  const [imagePrompt, setImagePrompt] = useState("");
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("Обработка...");
  const [error, setError] = useState<AppErrorPayload | null>(null);
  const [copyLabel, setCopyLabel] = useState("Копировать");

  const resultSectionRef = useRef<HTMLElement>(null);

  function handleClear() {
    setUrl("");
    setPreview(null);
    setPreviewError(null);
    setPreviewLoading(false);
    setResult("");
    setResultType("text");
    setImagePrompt("");
    setError(null);
    setActiveAction(null);
    setCopyLabel("Копировать");
  }

  async function handleCopy() {
    const textToCopy = resultType === "image" ? imagePrompt : result;
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopyLabel("Скопировано");
      window.setTimeout(() => setCopyLabel("Копировать"), 2000);
    } catch {
      setCopyLabel("Не удалось");
      window.setTimeout(() => setCopyLabel("Копировать"), 2000);
    }
  }

  useEffect(() => {
    if (loading) {
      resultSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [loading]);

  useEffect(() => {
    const trimmed = url.trim();

    setPreview(null);
    setPreviewError(null);

    if (!trimmed || !isValidUrl(trimmed)) {
      setPreviewLoading(false);
      return;
    }

    setPreviewLoading(true);

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: trimmed }),
        });

        if (cancelled) return;

        const raw = await response.text();
        let data: ParseResponse = {};

        try {
          data = raw ? (JSON.parse(raw) as ParseResponse) : {};
        } catch {
          setPreviewError("Не удалось загрузить предпросмотр.");
          return;
        }

        if (!response.ok) {
          setPreviewError(data.error?.message ?? "Не удалось загрузить предпросмотр.");
          return;
        }

        if (data.preview) {
          setPreview(data.preview);
        }
      } catch {
        if (!cancelled) {
          setPreviewError("Не удалось загрузить предпросмотр.");
        }
      } finally {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      }
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      setPreviewLoading(false);
    };
  }, [url]);

  async function handleTextAction(action: Exclude<ActionType, "illustration">) {
    setError(null);
    setResult("");
    setResultType("text");
    setImagePrompt("");
    setCopyLabel("Копировать");
    setActiveAction(action);
    setLoading(true);
    setLoadingLabel(ACTION_LOADING_LABELS[action]);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, action }),
      });

      const raw = await response.text();
      let data: ApiSuccessResponse = {};

      try {
        data = raw ? (JSON.parse(raw) as ApiSuccessResponse) : {};
      } catch {
        setError(getErrorPayload(ERROR_CODES.NETWORK));
        return;
      }

      if (!response.ok) {
        const fallbackCode =
          response.status === 502
            ? ERROR_CODES.ARTICLE_FETCH_FAILED
            : response.status === 504
              ? ERROR_CODES.AI_TIMEOUT
              : response.status === 503
                ? ERROR_CODES.AI_UNAVAILABLE
                : ERROR_CODES.UNKNOWN;

        setError(resolveClientError(data, fallbackCode));
        return;
      }

      const nextResult = typeof data.result === "string" ? data.result : "";
      setResultType("text");
      setResult(nextResult);
    } catch {
      setError(getErrorPayload(ERROR_CODES.NETWORK));
    } finally {
      setLoading(false);
    }
  }

  async function handleIllustrationAction() {
    setError(null);
    setResult("");
    setResultType("text");
    setImagePrompt("");
    setCopyLabel("Копировать");
    setActiveAction("illustration");
    setLoading(true);
    setLoadingLabel(ACTION_LOADING_LABELS.illustration);

    try {
      const response = await fetch("/api/illustrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const raw = await response.text();
      let data: ApiSuccessResponse = {};

      try {
        data = raw ? (JSON.parse(raw) as ApiSuccessResponse) : {};
      } catch {
        setError(getErrorPayload(ERROR_CODES.NETWORK));
        return;
      }

      if (!response.ok) {
        const fallbackCode =
          response.status === 504
            ? ERROR_CODES.AI_TIMEOUT
            : response.status === 503
              ? ERROR_CODES.IMAGE_UNAVAILABLE
              : ERROR_CODES.IMAGE_FAILED;

        setError(resolveClientError(data, fallbackCode));
        return;
      }

      const nextResult = typeof data.result === "string" ? data.result : "";
      setResultType("image");
      setResult(nextResult);
      setImagePrompt(typeof data.imagePrompt === "string" ? data.imagePrompt : "");
    } catch {
      setError(getErrorPayload(ERROR_CODES.NETWORK));
    } finally {
      setLoading(false);
    }
  }

  function handleAction(action: ActionType) {
    if (action === "illustration") {
      void handleIllustrationAction();
      return;
    }

    void handleTextAction(action);
  }

  const isDisabled = !url.trim() || loading || !isValidUrl(url.trim());
  const hasContent = Boolean(url || preview || result || error || activeAction || imagePrompt);
  const copyButtonLabel = resultType === "image" ? (copyLabel === "Копировать" ? "Копировать промпт" : copyLabel) : copyLabel;

  return (
    <div className="relative z-10 mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-6 sm:gap-8">
      <header className="space-y-2 text-center sm:text-left">
        <h1 className="ancient-rus-title text-2xl font-bold tracking-tight sm:text-3xl">
          Moi referent RU
        </h1>
        <p className="text-sm leading-relaxed text-bark-muted sm:text-base">
          Вставьте ссылку на франкоязычную статью и выберите нужное действие.
        </p>
      </header>

      <section className="ancient-rus-card min-w-0 rounded-2xl p-4 sm:p-6">
        <div className="ancient-rus-card-accent" />
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <label htmlFor="article-url" className="min-w-0 text-sm font-medium text-scarlet">
            URL франкоязычной статьи
          </label>
          <button
            type="button"
            onClick={handleClear}
            disabled={loading || !hasContent}
            className="ancient-rus-btn-secondary w-fit shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
          >
            Очистить
          </button>
        </div>
        <input
          id="article-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.fr/article..."
          className="ancient-rus-input w-full min-w-0 rounded-xl border border-border-scarlet/55 bg-scarlet-pale/15 px-4 py-3 text-base text-bark break-all placeholder:text-bark-muted/60 sm:text-sm"
        />

        <ArticlePreviewCard preview={preview} loading={previewLoading} error={previewError} />

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {ACTIONS.map((action) => {
            const isActive = loading && activeAction === action.id;

            return (
              <button
                key={action.id}
                type="button"
                disabled={isDisabled}
                onClick={() => handleAction(action.id)}
                aria-busy={isActive}
                className={`ancient-rus-btn flex w-full min-w-0 flex-col items-start rounded-xl px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-50 ${
                  isActive ? "border-scarlet ring-2 ring-scarlet/25" : ""
                }`}
              >
                <span className="ancient-rus-btn-label font-semibold break-words">{action.label}</span>
                <span className="mt-1 text-xs leading-relaxed break-words text-bark-muted">
                  {action.description}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section
        ref={resultSectionRef}
        className="ancient-rus-card min-w-0 scroll-mt-4 rounded-2xl p-4 sm:scroll-mt-6 sm:p-6"
      >
        <div className="ancient-rus-card-accent" />
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="ancient-rus-section-title text-lg font-semibold">Результат</h2>
          <div className="flex flex-wrap items-center gap-2">
            {!loading && result && (
              <button
                type="button"
                onClick={handleCopy}
                className="ancient-rus-btn-secondary rounded-lg px-3 py-1.5 text-xs font-medium"
              >
                {copyButtonLabel}
              </button>
            )}
            {activeAction && !loading && result && (
              <span className="ancient-rus-badge max-w-full truncate rounded-full px-3 py-1 text-xs font-medium">
                {ACTIONS.find((a) => a.id === activeAction)?.label}
              </span>
            )}
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-3 rounded-xl border border-scarlet/25 bg-scarlet-pale/35 px-4 py-6 text-sm text-bark-muted sm:py-8">
            <span className="inline-block h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-scarlet-pale border-t-scarlet" />
            <span className="min-w-0 break-words">{loadingLabel}</span>
          </div>
        )}

        {!loading && error && <ErrorAlert error={error} />}

        {!loading && !error && !result && (
          <p className="rounded-xl border border-dashed border-scarlet/25 bg-scarlet-pale/20 px-4 py-6 text-center text-sm leading-relaxed text-bark-muted sm:py-8">
            Результат появится здесь после нажатия на одну из кнопок.
          </p>
        )}

        {!loading && result && resultType === "text" && (
          <div className="result-scroll max-h-[min(36rem,70vh)] overflow-y-auto overflow-x-hidden rounded-xl border border-scarlet/20 bg-scarlet-pale/10">
            <p className="whitespace-pre-wrap break-words px-4 py-4 text-sm leading-relaxed text-bark">
              {result}
            </p>
          </div>
        )}

        {!loading && result && resultType === "image" && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-scarlet/20 bg-scarlet-pale/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result}
                alt="Сгенерированная иллюстрация по теме статьи"
                className="mx-auto h-auto max-h-[min(36rem,70vh)] w-full object-contain"
              />
            </div>
            {imagePrompt && (
              <details className="rounded-xl border border-scarlet/15 bg-scarlet-pale/15 px-4 py-3 text-sm text-bark-muted">
                <summary className="cursor-pointer font-medium text-scarlet">Промпт для изображения</summary>
                <p className="mt-2 break-words leading-relaxed">{imagePrompt}</p>
              </details>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
