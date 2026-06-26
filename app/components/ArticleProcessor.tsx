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
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-bark">
          Moi referent RU
        </h1>
        <p className="text-bark-muted">
          Вставьте ссылку на франкоязычную статью и выберите нужное действие.
        </p>
      </header>

      <section className="ancient-rus-card rounded-2xl p-6">
        <label htmlFor="article-url" className="mb-2 block text-sm font-medium text-bark">
          URL франкоязычной статьи
        </label>
        <input
          id="article-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.fr/article..."
          className="w-full rounded-xl border border-border-warm bg-parchment/60 px-4 py-3 text-bark placeholder:text-bark-muted/60 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/25"
        />

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              disabled={isDisabled}
              onClick={() => handleAction(action.id)}
              className="flex flex-col items-start rounded-xl border border-border-warm bg-parchment-deep/50 px-4 py-3 text-left transition hover:border-burgundy-soft/50 hover:bg-gold-pale/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="font-semibold text-bark">{action.label}</span>
              <span className="mt-1 text-xs text-bark-muted">{action.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="ancient-rus-card rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-bark">Результат</h2>
          {activeLabel && (
            <span className="rounded-full bg-gold-pale px-3 py-1 text-xs font-medium text-burgundy">
              {activeLabel}
            </span>
          )}
        </div>

        {loading && (
          <div className="flex items-center gap-3 rounded-xl bg-parchment-deep/60 px-4 py-8 text-bark-muted">
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-border-warm border-t-burgundy" />
            Парсинг статьи...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-burgundy/30 bg-burgundy/10 px-4 py-3 text-burgundy">
            {error}
          </div>
        )}

        {!loading && !error && !result && (
          <p className="rounded-xl bg-parchment-deep/60 px-4 py-8 text-center text-bark-muted">
            Результат появится здесь после нажатия на одну из кнопок.
          </p>
        )}

        {!loading && result && (
          <pre className="whitespace-pre-wrap rounded-xl bg-parchment-deep/60 px-4 py-4 text-sm leading-relaxed text-bark">
            {result}
          </pre>
        )}
      </section>
    </div>
  );
}
