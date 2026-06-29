import { AppError, ERROR_CODES } from "@/lib/errors";

const IMAGE_TIMEOUT_MS = 30_000;

const DEFAULT_MODEL = "stabilityai/stable-diffusion-xl-base-1.0";

function getHuggingFaceApiKey(): string {
  const apiKey = process.env.HUGGINGFACE_API_KEY?.replace(/^["']|["']$/g, "");

  if (!apiKey) {
    throw new AppError(ERROR_CODES.IMAGE_UNAVAILABLE);
  }

  return apiKey;
}

function getHuggingFaceModel(): string {
  return (
    process.env.HUGGINGFACE_MODEL?.replace(/^["']|["']$/g, "") ?? DEFAULT_MODEL
  );
}

type HuggingFaceErrorResponse = {
  error?: string;
  estimated_time?: number;
};

function mapHuggingFaceStatus(status: number): AppError {
  if (status === 401 || status === 403) {
    return new AppError(ERROR_CODES.IMAGE_UNAVAILABLE);
  }

  if (status === 429) {
    return new AppError(ERROR_CODES.IMAGE_FAILED);
  }

  if (status === 503) {
    return new AppError(ERROR_CODES.IMAGE_UNAVAILABLE);
  }

  return new AppError(ERROR_CODES.IMAGE_FAILED);
}

export async function generateImageFromPrompt(prompt: string, attempt = 0): Promise<string> {
  const apiKey = getHuggingFaceApiKey();
  const model = getHuggingFaceModel();
  const trimmedPrompt = prompt.trim();

  if (!trimmedPrompt) {
    throw new AppError(ERROR_CODES.IMAGE_FAILED);
  }

  if (attempt > 1) {
    throw new AppError(ERROR_CODES.IMAGE_UNAVAILABLE);
  }

  let response: Response;

  try {
    response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: trimmedPrompt }),
      signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new AppError(ERROR_CODES.AI_TIMEOUT);
    }
    throw new AppError(ERROR_CODES.IMAGE_FAILED);
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const data = (await response.json()) as HuggingFaceErrorResponse;

    if (data.error?.toLowerCase().includes("loading")) {
      const waitSeconds = Math.min(Math.max(data.estimated_time ?? 15, 5), 25);
      await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
      return generateImageFromPrompt(prompt, attempt + 1);
    }

    if (!response.ok) {
      throw mapHuggingFaceStatus(response.status);
    }

    throw new AppError(ERROR_CODES.IMAGE_FAILED);
  }

  if (!response.ok) {
    throw mapHuggingFaceStatus(response.status);
  }

  const buffer = await response.arrayBuffer();

  if (buffer.byteLength === 0) {
    throw new AppError(ERROR_CODES.IMAGE_FAILED);
  }

  const mime = contentType.startsWith("image/") ? contentType.split(";")[0] : "image/jpeg";
  const base64 = Buffer.from(buffer).toString("base64");

  return `data:${mime};base64,${base64}`;
}
