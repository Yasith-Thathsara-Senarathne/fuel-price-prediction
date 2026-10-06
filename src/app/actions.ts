"use server";

import { revalidatePath } from "next/cache";
import { runIngestion, type IngestionResult } from "@/lib/ingest";
import { prisma } from "@/lib/prisma";

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

const VIEW_COUNTER_KEY = "views";

/**
 * Returns the total site view count, incrementing it first when `increment`
 * is set. The client only increments once per browser session so reloads and
 * client-side navigations don't inflate the number.
 */
export async function recordViewAction(increment: boolean): Promise<number> {
  const counter = increment
    ? await prisma.siteCounter.upsert({
        where: { key: VIEW_COUNTER_KEY },
        create: { key: VIEW_COUNTER_KEY, value: 1 },
        update: { value: { increment: 1 } },
      })
    : await prisma.siteCounter.findUnique({ where: { key: VIEW_COUNTER_KEY } });
  return counter?.value ?? 0;
}
