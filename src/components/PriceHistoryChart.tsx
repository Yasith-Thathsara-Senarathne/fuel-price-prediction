"use client";

import { useMemo, useState } from "react";

export interface PricePoint {
  date: string; // ISO date
  price: number;
}

interface Props {
  title: string;
  points: PricePoint[];
}

const WIDTH = 640;
const HEIGHT = 260;
const PADDING = { top: 16, right: 16, bottom: 28, left: 48 };

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) return [min];
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => Math.round(min + step * i));
}

export function PriceHistoryChart({ title, points }: Props) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { path, xForIndex, yForPrice, yTicks } = useMemo(() => {
    const prices = points.map((p) => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pad = (max - min) * 0.1 || max * 0.05 || 1;
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

    return {
      path,
      xForIndex,
      yForPrice,
      yTicks: niceTicks(minPrice, maxPrice),
    };
  }, [points]);

  if (points.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-zinc-400">
        No history yet
      </div>
    );
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  const lastPoint = points[points.length - 1];

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

  return (
    <div>
      <div className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full touch-none"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
        role="img"
        aria-label={`${title} price history chart`}
      >
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

        <path
          d={path}
          fill="none"
          stroke="var(--chart-series-1)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* end marker + direct label */}
        <circle
          cx={xForIndex(points.length - 1)}
          cy={yForPrice(lastPoint.price)}
          r={4}
          fill="var(--chart-series-1)"
          stroke="var(--chart-surface)"
          strokeWidth={2}
        />
        <text
          x={xForIndex(points.length - 1)}
          y={yForPrice(lastPoint.price) - 10}
          textAnchor="end"
          fontSize={12}
          fontWeight={600}
          fill="var(--chart-text-secondary)"
        >
          {lastPoint.price.toFixed(2)}
        </text>

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

      {hovered && (
        <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            Rs. {hovered.price.toFixed(2)}
          </span>{" "}
          on {hovered.date}
        </div>
      )}
    </div>
  );
}
