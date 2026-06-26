"use client";

import { useState } from "react";
import {
  ACTION_LOADING_LABELS,
  ACTIONS,
  type ActionType,
} from "@/lib/actions";
import { formatUserError } from "@/lib/errors";

export default function ArticleProcessor() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState("");
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAction(action: ActionType) {
    setError("");
    setResult("");
    setActiveAction(action);
    setLoading(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, action }),
      });

      const raw = await response.text();
      let data: { error?: string; result?: string } = {};

      try {
        data = raw ? (JSON.parse(raw) as { error?: string; result?: string }) : {};
      } catch {
        setError(formatUserError(new Error(raw || "Не удалось выполнить запрос")));
        return;
      }

      if (!response.ok) {
        setError(data.error ?? formatUserError(new Error(raw)));
        return;
      }

      setResult(typeof data.result === "string" ? data.result : "");
    } catch (error) {
      setError(formatUserError(error));
    } finally {
      setLoading(false);
    }
  }

  const isDisabled = !url.trim() || loading;
  const loadingLabel = activeAction ? ACTION_LOADING_LABELS[activeAction] : "Обработка...";

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
        <label htmlFor="article-url" className="mb-2 block text-sm font-medium text-scarlet">
          URL франкоязычной статьи
        </label>
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

      <section className="ancient-rus-card rounded-2xl p-6">
        <div className="ancient-rus-card-accent" />
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="ancient-rus-section-title text-lg font-semibold">Результат</h2>
          {activeAction && !loading && result && (
            <span className="ancient-rus-badge rounded-full px-3 py-1 text-xs font-medium">
              {ACTIONS.find((a) => a.id === activeAction)?.label}
            </span>
          )}
        </div>

        {loading && (
          <div className="flex items-center gap-3 rounded-xl border border-scarlet/25 bg-scarlet-pale/35 px-4 py-8 text-bark-muted">
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-scarlet-pale border-t-scarlet" />
            {loadingLabel}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-scarlet/35 bg-scarlet-pale px-4 py-3 text-scarlet">
            {error}
          </div>
        )}

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
