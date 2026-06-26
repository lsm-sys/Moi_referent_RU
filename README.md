# Moi referent RU

Обработка франкоязычных статей для соцсетей: парсинг и генерация текстов через OpenRouter (DeepSeek).

## Возможности

- Парсинг статьи по URL (заголовок, дата, текст)
- **О чем статья?** — краткое содержание на русском
- **Пост для Дзен** — текст для публикации
- **Пост для Telegram** — короткий пост

## Локальный запуск

```powershell
cd c:\Work\Moi_referent_RU
npm install
Copy-Item .env.example .env.local
# Укажите OPENROUTER_API_KEY в .env.local
npm run dev
```

Откройте http://localhost:3000

## Переменные окружения

| Переменная | Обязательна | Описание |
|------------|-------------|----------|
| `OPENROUTER_API_KEY` | да | Ключ API OpenRouter |
| `OPENROUTER_BASE_URL` | нет | URL chat/completions (есть значение по умолчанию) |
| `OPENROUTER_SITE_URL` | нет | URL сайта для заголовка HTTP-Referer |

## Деплой на Vercel

1. Подключите репозиторий GitHub к Vercel.
2. В **Settings → Environment Variables** добавьте `OPENROUTER_API_KEY`.
3. При необходимости добавьте `OPENROUTER_SITE_URL` (ваш production-домен).
4. Сделайте redeploy.

## Сборка

```powershell
npm run build
npm run start
```
