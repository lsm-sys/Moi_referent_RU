import { AppError, ERROR_CODES, getErrorPayload, type AppErrorPayload } from "@/lib/errors";

export type IllustrationJobPhase = "prompt" | "image";
export type IllustrationJobStatus = "processing" | "completed" | "failed";

export type IllustrationJob = {
  id: string;
  status: IllustrationJobStatus;
  phase: IllustrationJobPhase;
  result?: string;
  imagePrompt?: string;
  error?: AppErrorPayload;
  createdAt: number;
  updatedAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __illustrationJobs: Map<string, IllustrationJob> | undefined;
}

const JOB_TTL_MS = 15 * 60 * 1000;

const jobs = globalThis.__illustrationJobs ??= new Map<string, IllustrationJob>();

function pruneJobs(): void {
  const now = Date.now();

  for (const [id, job] of jobs.entries()) {
    if (now - job.updatedAt > JOB_TTL_MS) {
      jobs.delete(id);
    }
  }
}

export function createIllustrationJob(): IllustrationJob {
  pruneJobs();

  const job: IllustrationJob = {
    id: crypto.randomUUID(),
    status: "processing",
    phase: "prompt",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  jobs.set(job.id, job);
  return job;
}

export function getIllustrationJob(jobId: string): IllustrationJob | null {
  pruneJobs();
  return jobs.get(jobId) ?? null;
}

export function setIllustrationJobPhase(jobId: string, phase: IllustrationJobPhase): void {
  const job = jobs.get(jobId);
  if (!job) return;

  job.phase = phase;
  job.updatedAt = Date.now();
}

export function completeIllustrationJob(
  jobId: string,
  payload: { result: string; imagePrompt: string },
): void {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = "completed";
  job.phase = "image";
  job.result = payload.result;
  job.imagePrompt = payload.imagePrompt;
  job.updatedAt = Date.now();
}

export function failIllustrationJob(jobId: string, error: unknown): void {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = "failed";
  job.error =
    error instanceof AppError
      ? getErrorPayload(error.code)
      : getErrorPayload(ERROR_CODES.IMAGE_FAILED);
  job.updatedAt = Date.now();
}

export function toIllustrationJobResponse(job: IllustrationJob) {
  return {
    jobId: job.id,
    status: job.status,
    phase: job.phase,
    result: job.result,
    resultType: job.result ? ("image" as const) : undefined,
    imagePrompt: job.imagePrompt,
    error: job.error,
  };
}
