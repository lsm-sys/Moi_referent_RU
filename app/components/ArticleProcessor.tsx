"use client";

import { useState } from "react";
import type { ActionType } from "@/lib/actions";

const ACTIONS: { id: ActionType; label: string; description: string }[] = [
  {
    id: "summary",
    label: "О чем статья?",
    description: "Краткое содержание на русском",
  },
  {
    id: "dzen",
    label: "Пост для Дзен",
    description: "Текст для публикации в Дзен",
  },
  {
    id: "telegram",
    label: "Пост для Telegram",
    description: "Текст для публикации в Telegram",
  },
];

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

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Не удалось выполнить запрос");
        return;
      }

      setResult(data.result);
    } catch {
      setError("Ошибка сети. Проверьте подключение и попробуйте снова.");
    } finally {
      setLoading(false);
    }
  }

  const isDisabled = !url.trim() || loading;
  const activeLabel = ACTIONS.find((a) => a.id === activeAction)?.label;

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
        <label htmlFor="article-url" className="mb-2 block text-sm font-medium text-red">
          URL франкоязычной статьи
        </label>
        <input
          id="article-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.fr/article..."
          className="w-full rounded-xl border border-border-gold bg-gold-pale/30 px-4 py-3 text-bark placeholder:text-bark-muted/60 focus:border-red-soft focus:outline-none focus:ring-2 focus:ring-gold/30"
        />

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              disabled={isDisabled}
              onClick={() => handleAction(action.id)}
              className="ancient-rus-btn flex flex-col items-start rounded-xl px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="ancient-rus-btn-label font-semibold">{action.label}</span>
              <span className="mt-1 text-xs text-gold-deep">{action.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="ancient-rus-card rounded-2xl p-6">
        <div className="ancient-rus-card-accent" />
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="ancient-rus-section-title text-lg font-semibold">Результат</h2>
          {activeLabel && (
            <span className="ancient-rus-badge rounded-full px-3 py-1 text-xs font-medium">
              {activeLabel}
            </span>
          )}
        </div>

        {loading && (
          <div className="flex items-center gap-3 rounded-xl border border-border-gold/50 bg-gold-pale/40 px-4 py-8 text-bark-muted">
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gold border-t-red" />
            Парсинг статьи...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red/40 bg-red-pale px-4 py-3 text-red">
            {error}
          </div>
        )}

        {!loading && !error && !result && (
          <p className="rounded-xl border border-dashed border-border-gold/60 bg-gold-pale/25 px-4 py-8 text-center text-bark-muted">
            Результат появится здесь после нажатия на одну из кнопок.
          </p>
        )}

        {!loading && result && (
          <pre className="whitespace-pre-wrap rounded-xl border border-border-gold/40 bg-gold-pale/20 px-4 py-4 text-sm leading-relaxed text-bark">
            {result}
          </pre>
        )}
      </section>
    </div>
  );
}
