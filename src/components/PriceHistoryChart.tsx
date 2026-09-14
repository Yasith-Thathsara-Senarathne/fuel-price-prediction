"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface PricePoint {
  date: string; // ISO date
  price: number;
}

interface Props {
  title?: string;
  points: PricePoint[];
}

const WIDTH = 640;
const HEIGHT = 260;
const PADDING = { top: 16, right: 16, bottom: 28, left: 44 };

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) return [min];
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => Math.round(min + step * i));
}

export function PriceHistoryChart({ title, points }: Props) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { path, areaPath, xForIndex, yForPrice, yTicks } = useMemo(() => {
    const prices = points.map((p) => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pad = (max - min) * 0.15 || max * 0.05 || 1;
    const minPrice = min - pad;
    const maxPrice = max + pad;

    const plotWidth = WIDTH - PADDING.left - PADDING.right;
    const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;

    const xForIndex = (i: number) =>
      PADDING.left + (points.length <= 1 ? 0 : (i / (points.length - 1)) * plotWidth);
    const yForPrice = (v: number) =>
      PADDING.top + plotHeight - ((v - minPrice) / (maxPrice - minPrice)) * plotHeight;

    const path = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${xForIndex(i)} ${yForPrice(p.price)}`)
      .join(" ");

    const areaPath =
      points.length > 0
        ? `${path} L ${xForIndex(points.length - 1)} ${HEIGHT - PADDING.bottom} L ${xForIndex(0)} ${HEIGHT - PADDING.bottom} Z`
        : "";

    return {
      path,
      areaPath,
      xForIndex,
      yForPrice,
      yTicks: niceTicks(minPrice, maxPrice),
    };
  }, [points]);

  if (points.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-muted">
        No history yet
      </div>
    );
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  const lastPoint = points[points.length - 1];
  const gradientId = `chart-fill-${(title || "series").replace(/\s+/g, "-")}`;

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const x = (e.clientX - rect.left) * scaleX;

    let nearest = 0;
    let nearestDist = Infinity;
    points.forEach((_, i) => {
      const dist = Math.abs(xForIndex(i) - x);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  const tooltipLeftPct = hoverIndex !== null ? (xForIndex(hoverIndex) / WIDTH) * 100 : 0;
  const tooltipTopPct = hovered ? (yForPrice(hovered.price) / HEIGHT) * 100 : 0;
  const tooltipAlignEnd = tooltipLeftPct > 65;

  return (
    <div className="relative">
      {title && <div className="mb-2 text-sm font-medium text-foreground">{title}</div>}
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full touch-none"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
        role="img"
        aria-label={`${title ? `${title} ` : ""}price history chart`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-series-1)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--chart-series-1)" stopOpacity={0} />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={yForPrice(tick)}
              y2={yForPrice(tick)}
              stroke="var(--chart-grid)"
              strokeWidth={1}
            />
            <text
              x={PADDING.left - 8}
              y={yForPrice(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={11}
              fill="var(--chart-text-secondary)"
            >
              {tick}
            </text>
          </g>
        ))}

        <path d={areaPath} fill={`url(#${gradientId})`} />

        <motion.path
          key={path}
          d={path}
          fill="none"
          stroke="var(--chart-series-1)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />

        <circle
          cx={xForIndex(points.length - 1)}
          cy={yForPrice(lastPoint.price)}
          r={4}
          fill="var(--chart-series-1)"
          stroke="var(--chart-surface)"
          strokeWidth={2}
        />

        <text x={PADDING.left} y={HEIGHT - 8} fontSize={11} fill="var(--chart-text-secondary)">
          {points[0].date}
        </text>
        <text
          x={WIDTH - PADDING.right}
          y={HEIGHT - 8}
          textAnchor="end"
          fontSize={11}
          fill="var(--chart-text-secondary)"
        >
          {lastPoint.date}
        </text>

        {hovered && hoverIndex !== null && (
          <g>
            <line
              x1={xForIndex(hoverIndex)}
              x2={xForIndex(hoverIndex)}
              y1={PADDING.top}
              y2={HEIGHT - PADDING.bottom}
              stroke="var(--chart-text-secondary)"
              strokeWidth={1}
              strokeDasharray="2,2"
            />
            <circle
              cx={xForIndex(hoverIndex)}
              cy={yForPrice(hovered.price)}
              r={5}
              fill="var(--chart-series-1)"
              stroke="var(--chart-surface)"
              strokeWidth={2}
            />
          </g>
        )}
      </svg>

      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="pointer-events-none absolute z-10 rounded-lg border border-border-color bg-surface px-2.5 py-1.5 text-xs shadow-lg"
            style={{
              left: `${tooltipLeftPct}%`,
              top: `${tooltipTopPct}%`,
              transform: `translate(${tooltipAlignEnd ? "-100%" : "0%"}, -130%)`,
            }}
          >
            <div className="font-semibold text-foreground">Rs. {hovered.price.toFixed(2)}</div>
            <div className="text-muted">{hovered.date}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
