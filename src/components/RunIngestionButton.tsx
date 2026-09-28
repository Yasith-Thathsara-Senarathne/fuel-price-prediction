"use client";

import { useActionState } from "react";
import { RefreshCw } from "lucide-react";
import { runIngestionAction, type RunIngestionState } from "@/app/actions";

const initialState: RunIngestionState = { status: "idle" };

export function RunIngestionButton({ requiresSecret }: { requiresSecret: boolean }) {
  const [state, formAction, pending] = useActionState(runIngestionAction, initialState);

  return (
    <form action={formAction} className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex items-center gap-2">
        {requiresSecret && (
          <input
            type="password"
            name="secret"
            placeholder="Cron secret"
            autoComplete="off"
            required
            className="h-9 w-36 rounded-lg border border-border-color bg-surface px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        )}
        <button
          type="submit"
          disabled={pending}
          className="flex h-9 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <RefreshCw size={14} className={pending ? "animate-spin" : undefined} />
          {pending ? "Running…" : "Run ingestion"}
        </button>
      </div>

      {state.status === "unauthorized" && (
        <p className="text-xs text-danger">Incorrect secret.</p>
      )}
      {state.status === "done" && (
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {state.results.map((r) => (
            <li
              key={r.source}
              className={r.status === "SUCCESS" ? "text-success" : "text-danger"}
              title={r.status === "FAILURE" ? r.message : undefined}
            >
              {r.source}: {r.status === "SUCCESS" ? `${r.itemsFetched} items` : "failed"}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
