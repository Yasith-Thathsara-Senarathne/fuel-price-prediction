"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PriceHistoryChart, type PricePoint } from "./PriceHistoryChart";
import { AnimatedNumber } from "./AnimatedNumber";
import { TrendBadge } from "./TrendBadge";

export interface FuelSeries {
  fuelType: string;
  label: string;
  points: PricePoint[];
}

const RANGES = [
  { key: "30d", label: "30D", days: 30 },
  { key: "90d", label: "90D", days: 90 },
  { key: "180d", label: "180D", days: 180 },
  { key: "all", label: "All", days: null },
] as const;

export function HistoryExplorer({ series }: { series: FuelSeries[] }) {
  const [activeFuel, setActiveFuel] = useState(series[0]?.fuelType);
  const [rangeIndex, setRangeIndex] = useState(1);

  const active = series.find((s) => s.fuelType === activeFuel) ?? series[0];
  const range = RANGES[rangeIndex];

  const filteredPoints = useMemo(() => {
    if (!active) return [];
    if (range.days === null) return active.points;
    return active.points.slice(-range.days);
  }, [active, range]);

  const first = filteredPoints[0];
  const last = filteredPoints[filteredPoints.length - 1];
  const delta = first && last ? last.price - first.price : null;
  const deltaPct = delta !== null && first ? (delta / first.price) * 100 : null;

  return (
    <div className="rounded-2xl border border-border-color bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-full bg-background p-1">
          {series.map((s) => (
            <button
              key={s.fuelType}
              type="button"
              onClick={() => setActiveFuel(s.fuelType)}
              className={`relative rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                s.fuelType === activeFuel ? "text-accent-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              {s.fuelType === activeFuel && (
                <motion.span
                  layoutId="history-tab-pill"
                  className="absolute inset-0 rounded-full bg-accent"
                  transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
                />
              )}
              <span className="relative">{s.label}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-1 rounded-full bg-background p-1 text-xs">
          {RANGES.map((r, i) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRangeIndex(i)}
              className={`relative rounded-full px-2.5 py-1.5 font-medium transition-colors ${
                i === rangeIndex ? "text-accent-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              {i === rangeIndex && (
                <motion.span
                  layoutId="history-range-pill"
                  className="absolute inset-0 rounded-full bg-accent"
                  transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
                />
              )}
              <span className="relative">{r.label}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeFuel}-${range.key}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {last && (
            <div className="mt-5 flex items-baseline gap-2">
              <div className="text-2xl font-semibold tabular-nums tracking-tight">
                Rs. <AnimatedNumber value={last.price} />
              </div>
              {deltaPct !== null && <TrendBadge deltaPct={deltaPct} suffix={`over ${range.label}`} />}
            </div>
          )}

          <div className="mt-4">
            <PriceHistoryChart points={filteredPoints} />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
