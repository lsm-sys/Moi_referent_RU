# Moi referent RU

Обработка франкоязычных статей для соцсетей: парсинг и генерация текстов через OpenRouter (DeepSeek).

## Возможности

- Парсинг статьи по URL (заголовок, дата, текст)
- **О чем статья?** — краткое содержание на русском
- **Пост для Дзен** — текст для публикации
- **Пост для Telegram** — короткий пост
- **Иллюстрация** — промпт через OpenRouter + изображение через Hugging Face

## Локальный запуск

```powershell
cd c:\Work\Moi_referent_RU
npm install
Copy-Item .env.example .env.local
# Укажите OPENROUTER_API_KEY в .env.local
npm run dev
```

Откройте http://localhost:3000

> **Важно:** приложение всегда запускается на порту **3000**. Скрипт `npm run dev` автоматически освобождает этот порт. Если в браузере видите другое приложение (например, «Referent»), значит открыт старый процесс — перезапустите `npm run dev` в этой папке.

### Стили не загружаются (белый фон, серые кнопки)

Обычно это повреждённый кэш `.next`. Выполните:

```powershell
npm run clean
npm run dev
```

Затем обновите страницу с очисткой кэша: **Ctrl+F5**.

### Ошибка `__webpack_modules__[moduleId] is not a function`

Повреждённый кэш `.next` (часто после `npm run build` при работающем dev-сервере). Не запускайте сборку и dev одновременно:

```powershell
npm run clean
npm run dev
```

Если не помогло — закройте все окна терминала с Node и запустите `npm run dev` заново.

## Переменные окружения

| Переменная | Обязательна | Описание |
|------------|-------------|----------|
| `OPENROUTER_API_KEY` | да | Ключ API OpenRouter |
| `OPENROUTER_BASE_URL` | нет | URL chat/completions (есть значение по умолчанию) |
| `OPENROUTER_SITE_URL` | нет | URL сайта для заголовка HTTP-Referer |
| `HUGGINGFACE_API_KEY` | для иллюстраций | Ключ API Hugging Face |
| `HUGGINGFACE_MODEL` | нет | Модель генерации изображений (по умолчанию Stable Diffusion XL) |

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
