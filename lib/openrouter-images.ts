import { AppError, ERROR_CODES } from "@/lib/errors";

const IMAGE_TIMEOUT_MS = 45_000;

const DEFAULT_IMAGE_MODEL = "black-forest-labs/flux.2-klein-4b";

type ImageGenerationResponse = {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
  error?: {
    message?: string;
  };
};

function getOpenRouterApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY?.replace(/^["']|["']$/g, "");

  if (!apiKey) {
    throw new AppError(ERROR_CODES.IMAGE_UNAVAILABLE);
  }

  return apiKey;
}

function getOpenRouterImagesUrl(): string {
  const raw =
    process.env.OPENROUTER_BASE_URL ??
    process.env.OPENAI_BASE_URL ??
    "https://openrouter.ai/api/v1/chat/completions";

  const normalized = raw
    .replace(/^["']|["']$/g, "")
    .replace(/\/chat\/completions\/?$/, "")
    .replace(/\/$/, "");

  return `${normalized}/images`;
}

function getOpenRouterImageModel(): string {
  return (
    process.env.OPENROUTER_IMAGE_MODEL?.replace(/^["']|["']$/g, "") ??
    DEFAULT_IMAGE_MODEL
  );
}

function mapOpenRouterImageStatus(status: number): AppError {
  if (status === 401 || status === 403) {
    return new AppError(ERROR_CODES.IMAGE_UNAVAILABLE);
  }

  if (status === 402 || status === 429) {
    return new AppError(ERROR_CODES.IMAGE_FAILED);
  }

  if (status === 408 || status === 504 || status === 524) {
    return new AppError(ERROR_CODES.AI_TIMEOUT);
  }

  if (status >= 500) {
    return new AppError(ERROR_CODES.IMAGE_UNAVAILABLE);
  }

  return new AppError(ERROR_CODES.IMAGE_FAILED);
}

export async function generateImageFromOpenRouter(prompt: string): Promise<string> {
  const apiKey = getOpenRouterApiKey();
  const trimmedPrompt = prompt.trim();

  if (!trimmedPrompt) {
    throw new AppError(ERROR_CODES.IMAGE_FAILED);
  }

  let response: Response;

  try {
    response = await fetch(getOpenRouterImagesUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "https://moi-referent-ru.vercel.app",
        "X-Title": "Moi referent RU",
      },
      body: JSON.stringify({
        model: getOpenRouterImageModel(),
        prompt: trimmedPrompt,
        aspect_ratio: "16:9",
        output_format: "jpeg",
      }),
      signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new AppError(ERROR_CODES.AI_TIMEOUT);
    }

    throw new AppError(ERROR_CODES.IMAGE_UNAVAILABLE);
  }

  let data: ImageGenerationResponse;

  try {
    data = (await response.json()) as ImageGenerationResponse;
  } catch {
    throw new AppError(ERROR_CODES.IMAGE_FAILED);
  }

  if (!response.ok) {
    throw mapOpenRouterImageStatus(response.status);
  }

  const image = data.data?.[0];
  const b64 = typeof image?.b64_json === "string" ? image.b64_json : "";

  if (b64) {
    return `data:image/jpeg;base64,${b64}`;
  }

  if (typeof image?.url === "string" && image.url.startsWith("http")) {
    return image.url;
  }

  throw new AppError(ERROR_CODES.IMAGE_FAILED);
}
