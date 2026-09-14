export interface TimeSeriesPoint {
  date: Date;
  value: number;
}

export interface LinearTrend {
  slopePerDay: number;
  interceptAtEpoch: number;
  residualStdDev: number;
}

/**
 * Ordinary least-squares fit of value ~ days-since-epoch, used to project a
 * short-term trend (crude oil price, exchange rate) forward to a target date.
 * Intended for short extrapolation windows (1-3 weeks) — do not treat this as
 * a general-purpose forecasting model.
 */
export function fitLinearTrend(points: TimeSeriesPoint[]): LinearTrend {
  if (points.length < 2) {
    throw new Error("fitLinearTrend requires at least 2 points");
  }

  const xs = points.map((p) => p.date.getTime() / 86_400_000);
  const ys = points.map((p) => p.value);
  const n = xs.length;

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (xs[i] - meanX) * (ys[i] - meanY);
    denominator += (xs[i] - meanX) ** 2;
  }
  const slopePerDay = denominator === 0 ? 0 : numerator / denominator;
  const interceptAtEpoch = meanY - slopePerDay * meanX;

  let sumSquaredResiduals = 0;
  for (let i = 0; i < n; i++) {
    const predicted = interceptAtEpoch + slopePerDay * xs[i];
    sumSquaredResiduals += (ys[i] - predicted) ** 2;
  }
  const residualStdDev = Math.sqrt(sumSquaredResiduals / n);

  return { slopePerDay, interceptAtEpoch, residualStdDev };
}

export function projectTrend(trend: LinearTrend, targetDate: Date): number {
  const x = targetDate.getTime() / 86_400_000;
  return trend.interceptAtEpoch + trend.slopePerDay * x;
}
