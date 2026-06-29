"use client";

import { useEffect, useRef, useState } from "react";
import { ErrorAlert } from "@/app/components/ErrorAlert";
import {
  ACTION_LOADING_LABELS,
  ACTIONS,
  type ActionType,
} from "@/lib/actions";
import {
  ERROR_CODES,
  getErrorPayload,
  type AppErrorPayload,
  type ErrorCode,
} from "@/lib/errors";

type ApiErrorResponse = {
  error?: AppErrorPayload;
  result?: string;
};

function resolveClientError(payload?: ApiErrorResponse, fallbackCode: ErrorCode = ERROR_CODES.UNKNOWN): AppErrorPayload {
  if (payload?.error?.code && payload.error.title && payload.error.message) {
    return payload.error;
  }
  return getErrorPayload(fallbackCode);
}

export default function ArticleProcessor() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState("");
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppErrorPayload | null>(null);
  const [copyLabel, setCopyLabel] = useState("Копировать");

  const resultSectionRef = useRef<HTMLElement>(null);
  const shouldScrollToResultRef = useRef(false);

  function handleClear() {
    setUrl("");
    setResult("");
    setError(null);
    setActiveAction(null);
    setCopyLabel("Копировать");
    shouldScrollToResultRef.current = false;
  }

  async function handleCopy() {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(result);
      setCopyLabel("Скопировано");
      window.setTimeout(() => setCopyLabel("Копировать"), 2000);
    } catch {
      setCopyLabel("Не удалось");
      window.setTimeout(() => setCopyLabel("Копировать"), 2000);
    }
  }

  useEffect(() => {
    if (!shouldScrollToResultRef.current || loading || !result) {
      return;
    }

    shouldScrollToResultRef.current = false;
    resultSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result, loading]);

  async function handleAction(action: ActionType) {
    setError(null);
    setResult("");
    setCopyLabel("Копировать");
    setActiveAction(action);
    setLoading(true);
    shouldScrollToResultRef.current = false;

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, action }),
      });

      const raw = await response.text();
      let data: ApiErrorResponse = {};

      try {
        data = raw ? (JSON.parse(raw) as ApiErrorResponse) : {};
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
      shouldScrollToResultRef.current = Boolean(nextResult);
      setResult(nextResult);
    } catch {
      setError(getErrorPayload(ERROR_CODES.NETWORK));
    } finally {
      setLoading(false);
    }
  }

  const isDisabled = !url.trim() || loading;
  const loadingLabel = activeAction ? ACTION_LOADING_LABELS[activeAction] : "Обработка...";
  const hasContent = Boolean(url || result || error || activeAction);

  return (
    <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-8">
      <header className="space-y-2 text-center sm:text-left">
        <h1 className="ancient-rus-title text-3xl font-bold tracking-tight">
          Moi referent RU
        </h1>
        <p className="text-bark-muted">
          Вставьте ссылку на франкоязычную статью и выберите нужное действие.
        </p>
      </header>

      <section className="ancient-rus-card rounded-2xl p-6">
        <div className="ancient-rus-card-accent" />
        <div className="mb-2 flex items-center justify-between gap-3">
          <label htmlFor="article-url" className="block text-sm font-medium text-scarlet">
            URL франкоязычной статьи
          </label>
          <button
            type="button"
            onClick={handleClear}
            disabled={loading || !hasContent}
            className="ancient-rus-btn-secondary rounded-lg px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
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
          className="ancient-rus-input w-full rounded-xl border border-border-scarlet/55 bg-scarlet-pale/15 px-4 py-3 text-bark placeholder:text-bark-muted/60"
        />

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {ACTIONS.map((action) => {
            const isActive = loading && activeAction === action.id;

            return (
              <button
                key={action.id}
                type="button"
                disabled={isDisabled}
                onClick={() => handleAction(action.id)}
                aria-busy={isActive}
                className={`ancient-rus-btn flex flex-col items-start rounded-xl px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-50 ${
                  isActive ? "border-scarlet ring-2 ring-scarlet/25" : ""
                }`}
              >
                <span className="ancient-rus-btn-label font-semibold">{action.label}</span>
                <span className="mt-1 text-xs text-bark-muted">{action.description}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section ref={resultSectionRef} className="ancient-rus-card scroll-mt-6 rounded-2xl p-6">
        <div className="ancient-rus-card-accent" />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="ancient-rus-section-title text-lg font-semibold">Результат</h2>
          <div className="flex flex-wrap items-center gap-2">
            {!loading && result && (
              <button
                type="button"
                onClick={handleCopy}
                className="ancient-rus-btn-secondary rounded-lg px-3 py-1.5 text-xs font-medium"
              >
                {copyLabel}
              </button>
            )}
            {activeAction && !loading && result && (
              <span className="ancient-rus-badge rounded-full px-3 py-1 text-xs font-medium">
                {ACTIONS.find((a) => a.id === activeAction)?.label}
              </span>
            )}
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-3 rounded-xl border border-scarlet/25 bg-scarlet-pale/35 px-4 py-8 text-bark-muted">
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-scarlet-pale border-t-scarlet" />
            {loadingLabel}
          </div>
        )}

        {!loading && error && <ErrorAlert error={error} />}

        {!loading && !error && !result && (
          <p className="rounded-xl border border-dashed border-scarlet/25 bg-scarlet-pale/20 px-4 py-8 text-center text-bark-muted">
            Результат появится здесь после нажатия на одну из кнопок.
          </p>
        )}

        {!loading && result && (
          <div className="result-scroll max-h-[36rem] overflow-y-auto rounded-xl border border-scarlet/20 bg-scarlet-pale/10">
            <p className="whitespace-pre-wrap px-4 py-4 text-sm leading-relaxed text-bark">
              {result}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
