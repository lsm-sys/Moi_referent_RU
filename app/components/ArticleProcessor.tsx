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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Moi referent RU
        </h1>
        <p className="text-slate-600">
          Вставьте ссылку на франкоязычную статью и выберите нужное действие.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label htmlFor="article-url" className="mb-2 block text-sm font-medium text-slate-700">
          URL франкоязычной статьи
        </label>
        <input
          id="article-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.fr/article..."
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              disabled={isDisabled}
              onClick={() => handleAction(action.id)}
              className="flex flex-col items-start rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="font-semibold text-slate-900">{action.label}</span>
              <span className="mt-1 text-xs text-slate-500">{action.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Результат</h2>
          {activeLabel && (
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
              {activeLabel}
            </span>
          )}
        </div>

        {loading && (
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-8 text-slate-600">
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
            Парсинг статьи...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && !result && (
          <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-slate-500">
            Результат появится здесь после нажатия на одну из кнопок.
          </p>
        )}

        {!loading && result && (
          <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 px-4 py-4 text-sm leading-relaxed text-slate-800">
            {result}
          </pre>
        )}
      </section>
    </div>
  );
}
