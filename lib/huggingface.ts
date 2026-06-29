import {
  InferenceClient,
  InferenceClientHubApiError,
  InferenceClientProviderApiError,
} from "@huggingface/inference";
import { AppError, ERROR_CODES } from "@/lib/errors";

const IMAGE_TIMEOUT_MS = 45_000;

const DEFAULT_MODEL = "black-forest-labs/FLUX.1-schnell";

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

function mapHttpStatus(status: number): AppError {
  if (status === 401 || status === 403) {
    return new AppError(ERROR_CODES.IMAGE_UNAVAILABLE);
  }

  if (status === 429) {
    return new AppError(ERROR_CODES.IMAGE_FAILED);
  }

  if (status === 503 || status === 410 || status === 404) {
    return new AppError(ERROR_CODES.IMAGE_UNAVAILABLE);
  }

  return new AppError(ERROR_CODES.IMAGE_FAILED);
}

function mapInferenceError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (
    error instanceof InferenceClientProviderApiError ||
    error instanceof InferenceClientHubApiError
  ) {
    return mapHttpStatus(error.httpResponse.status);
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (error.name === "AbortError" || message.includes("timeout")) {
      return new AppError(ERROR_CODES.AI_TIMEOUT);
    }

    if (
      message.includes("unauthorized") ||
      message.includes("forbidden") ||
      message.includes("api key") ||
      message.includes("authentication")
    ) {
      return new AppError(ERROR_CODES.IMAGE_UNAVAILABLE);
    }
  }

  return new AppError(ERROR_CODES.IMAGE_FAILED);
}

export async function generateImageFromPrompt(prompt: string): Promise<string> {
  const apiKey = getHuggingFaceApiKey();
  const model = getHuggingFaceModel();
  const trimmedPrompt = prompt.trim();

  if (!trimmedPrompt) {
    throw new AppError(ERROR_CODES.IMAGE_FAILED);
  }

  const client = new InferenceClient(apiKey);

  try {
    const dataUrl = await client.textToImage(
      {
        model,
        inputs: trimmedPrompt,
        provider: "auto",
        parameters: {
          num_inference_steps: model.includes("schnell") ? 4 : 20,
        },
      },
      {
        outputType: "dataUrl",
        fetch: (url, init) =>
          fetch(url, {
            ...init,
            signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
          }),
      },
    );

    if (!dataUrl.startsWith("data:image/")) {
      throw new AppError(ERROR_CODES.IMAGE_FAILED);
    }

    return dataUrl;
  } catch (error) {
    throw mapInferenceError(error);
  }
}
