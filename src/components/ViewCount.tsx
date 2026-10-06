"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { recordViewAction } from "@/app/actions";

const SESSION_KEY = "fpp:view-recorded";

function alreadyRecorded(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markRecorded() {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // Storage blocked (e.g. private mode) — worst case this tab counts again.
  }
}

export function ViewCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const increment = !alreadyRecorded();
    if (increment) markRecorded();
    recordViewAction(increment)
      .then(setCount)
      .catch(() => setCount(null));
  }, []);

  if (count === null) return null;

  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <Eye size={12} aria-hidden />
      {count.toLocaleString("en-LK")} {count === 1 ? "view" : "views"}
    </span>
  );
}
