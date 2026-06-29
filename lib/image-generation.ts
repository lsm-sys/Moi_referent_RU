import { AppError, ERROR_CODES } from "@/lib/errors";
import { generateImageFromPrompt as generateImageFromHuggingFace } from "@/lib/huggingface";
import { generateImageFromOpenRouter } from "@/lib/openrouter-images";

function hasEnv(name: string): boolean {
  return Boolean(process.env[name]?.replace(/^["']|["']$/g, "").trim());
}

export async function generateImageFromPrompt(prompt: string): Promise<string> {
  const canUseOpenRouter = hasEnv("OPENROUTER_API_KEY");
  const canUseHuggingFace = hasEnv("HUGGINGFACE_API_KEY");

  if (!canUseOpenRouter && !canUseHuggingFace) {
    throw new AppError(ERROR_CODES.IMAGE_UNAVAILABLE);
  }

  if (canUseOpenRouter) {
    try {
      return await generateImageFromOpenRouter(prompt);
    } catch (error) {
      if (canUseHuggingFace) {
        return generateImageFromHuggingFace(prompt);
      }

      throw error;
    }
  }

  return generateImageFromHuggingFace(prompt);
}
