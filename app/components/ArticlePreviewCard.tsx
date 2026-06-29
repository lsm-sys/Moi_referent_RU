import type { ArticlePreview } from "@/lib/article-preview";

type ArticlePreviewCardProps = {
  preview: ArticlePreview | null;
  loading: boolean;
  error: string | null;
};

function formatPreviewDate(date: string | null): string | null {
  if (!date) return null;

  const parsed = Date.parse(date);
  if (Number.isNaN(parsed)) return date;

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(parsed));
}

export function ArticlePreviewCard({ preview, loading, error }: ArticlePreviewCardProps) {
  if (!loading && !preview && !error) {
    return null;
  }

  return (
    <div className="mt-4 rounded-xl border border-scarlet/20 bg-scarlet-pale/15 px-4 py-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-scarlet">Предпросмотр статьи</h3>
        {preview?.cached && (
          <span className="rounded-full bg-scarlet-pale/60 px-2 py-0.5 text-xs text-bark-muted">
            из кэша
          </span>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-bark-muted">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-scarlet-pale border-t-scarlet" />
          Загружаю статью...
        </div>
      )}

      {!loading && error && (
        <p className="text-sm leading-relaxed text-bark-muted">{error}</p>
      )}

      {!loading && preview && (
        <div className="space-y-2 text-sm leading-relaxed text-bark">
          {preview.title && (
            <p>
              <span className="font-medium text-scarlet">Заголовок: </span>
              <span className="break-words">{preview.title}</span>
            </p>
          )}
          {formatPreviewDate(preview.date) && (
            <p>
              <span className="font-medium text-scarlet">Дата: </span>
              {formatPreviewDate(preview.date)}
            </p>
          )}
          <p className="break-words whitespace-pre-wrap text-bark-muted">{preview.excerpt}</p>
          <p className="text-xs text-bark-muted">
            Текст статьи: {preview.contentLength.toLocaleString("ru-RU")} символов
          </p>
        </div>
      )}
    </div>
  );
}
