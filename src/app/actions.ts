"use server";

import { revalidatePath } from "next/cache";
import { runIngestion, type IngestionResult } from "@/lib/ingest";

export type RunIngestionState =
  | { status: "idle" }
  | { status: "unauthorized" }
  | { status: "done"; ranAt: string; results: IngestionResult[] };

/**
 * Manually triggers the same ingestion job as the daily cron. Server Actions
 * are reachable by direct POST, so the CRON_SECRET check is repeated here.
 */
export async function runIngestionAction(
  _prev: RunIngestionState,
  formData: FormData
): Promise<RunIngestionState> {
  const secret = process.env.CRON_SECRET;
  if (secret && formData.get("secret") !== secret) {
    return { status: "unauthorized" };
  }

  const { ranAt, results } = await runIngestion();
  revalidatePath("/", "layout");
  return { status: "done", ranAt, results };
}
