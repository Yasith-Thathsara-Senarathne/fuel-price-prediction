"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Fuel } from "lucide-react";
import { AnimatedNumber } from "./AnimatedNumber";
import { Sparkline } from "./Sparkline";
import { TrendBadge } from "./TrendBadge";

export interface FormulaBreakdownView {
  basisCrudePrice: number;
  basisExchangeRate: number;
  landedCostPerLitreLkr: number;
  portHandlingPerLitre: number;
  distributionMarginPerLitre: number;
  dealerMarginPerLitre: number;
  exciseDutyPerLitre: number;
  preTaxPricePerLitre: number;
  palRate: number;
  vatRate: number;
}

export interface HorizonPrediction {
  key: string;
  label: string;
  dateLabel: string;
  predictedPrice: number | null;
  lowerBound: number | null;
  upperBound: number | null;
  breakdown: FormulaBreakdownView | null;
}

interface Props {
  label: string;
  currentPrice: number | null;
  currentDateLabel: string | null;
  currentSource: string | null;
  previousPrice: number | null;
  sparklinePoints: number[];
  horizons: HorizonPrediction[];
  index: number;
  defaultHorizonIndex?: number;
}

export function FuelCard({
  label,
  currentPrice,
  currentDateLabel,
  currentSource,
  previousPrice,
  sparklinePoints,
  horizons,
  index,
  defaultHorizonIndex = 0,
}: Props) {
  const [horizonIndex, setHorizonIndex] = useState(defaultHorizonIndex);
  const [expanded, setExpanded] = useState(false);
  const horizon = horizons[horizonIndex];

  const delta = currentPrice !== null && previousPrice !== null ? currentPrice - previousPrice : null;
  const deltaPct = delta !== null && previousPrice ? (delta / previousPrice) * 100 : null;
  const increased = (delta ?? 0) > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: "easeOut" }}
      whileHover={{ y: -3 }}
      className="group rounded-2xl border border-border-color bg-surface p-7 shadow-sm transition-shadow duration-300 hover:shadow-xl hover:shadow-accent/5"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Fuel size={19} />
          </span>
          <div className="text-base font-medium text-muted">{label}</div>
        </div>
        {sparklinePoints.length > 1 && <Sparkline points={sparklinePoints} width={112} height={36} positive={increased} />}
      </div>

      {currentPrice !== null ? (
        <>
          <div className="mt-4 flex items-baseline gap-2">
            <div className="text-4xl font-semibold tabular-nums tracking-tight">
              Rs. <AnimatedNumber value={currentPrice} />
            </div>
            {deltaPct !== null && <TrendBadge deltaPct={deltaPct} />}
          </div>
          <div className="mt-1.5 text-sm text-muted">
            as of {currentDateLabel} · {currentSource}
          </div>
        </>
      ) : (
        <div className="mt-4 text-sm text-muted">No price data yet</div>
      )}

      <div className="mt-5 border-t border-border-color pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted">Estimate</span>
          <div className="relative flex gap-0.5 rounded-full bg-background p-1 text-sm">
            {horizons.map((h, i) => (
              <button
                key={h.key}
                type="button"
                onClick={() => setHorizonIndex(i)}
                className={`relative whitespace-nowrap rounded-full px-3 py-1.5 transition-colors ${
                  i === horizonIndex ? "text-accent-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                {i === horizonIndex && (
                  <motion.span
                    layoutId={`pill-${label}`}
                    className="absolute inset-0 rounded-full bg-accent"
                    transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
                  />
                )}
                <span className="relative">{h.label}</span>
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={horizon.key}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {horizon.predictedPrice !== null ? (
              <>
                <div className="mt-2 text-2xl font-semibold text-accent tabular-nums">
                  Rs. <AnimatedNumber value={horizon.predictedPrice} />
                </div>
                <div className="mt-0.5 text-sm text-muted">
                  {horizon.dateLabel} · range Rs. {horizon.lowerBound?.toFixed(2)}–
                  {horizon.upperBound?.toFixed(2)}
                </div>
              </>
            ) : (
              <div className="mt-2 text-sm text-muted">Not enough data yet</div>
            )}
          </motion.div>
        </AnimatePresence>

        {horizon.breakdown && (
          <>
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="mt-4 flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
            >
              <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={14} />
              </motion.span>
              {expanded ? "Hide" : "Show"} formula breakdown
            </button>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <BreakdownTable breakdown={horizon.breakdown} />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </motion.div>
  );
}

function BreakdownTable({ breakdown }: { breakdown: FormulaBreakdownView }) {
  const rows: [string, string][] = [
    ["Assumed Brent price", `$${breakdown.basisCrudePrice.toFixed(2)}/bbl`],
    ["Assumed USD/LKR rate", breakdown.basisExchangeRate.toFixed(2)],
    ["Landed cost", `Rs. ${breakdown.landedCostPerLitreLkr.toFixed(2)}`],
    ["Port & handling", `Rs. ${breakdown.portHandlingPerLitre.toFixed(2)}`],
    ["Distribution margin", `Rs. ${breakdown.distributionMarginPerLitre.toFixed(2)}`],
    ["Dealer margin", `Rs. ${breakdown.dealerMarginPerLitre.toFixed(2)}`],
    ["Excise duty", `Rs. ${breakdown.exciseDutyPerLitre.toFixed(2)}`],
    ["Pre-tax price", `Rs. ${breakdown.preTaxPricePerLitre.toFixed(2)}`],
    ["PAL", `${(breakdown.palRate * 100).toFixed(1)}%`],
    ["VAT", `${(breakdown.vatRate * 100).toFixed(1)}%`],
  ];

  return (
    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-background p-4 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted">{k}</dt>
          <dd className="text-right font-medium tabular-nums">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
