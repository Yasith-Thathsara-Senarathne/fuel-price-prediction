import { prisma } from "@/lib/prisma";
import { calculateFormulaPrice, type FormulaBreakdown } from "@/lib/formula";
import { fitLinearTrend, projectTrend, type LinearTrend, type TimeSeriesPoint } from "@/lib/trend";
import type { CrudeOilPrice, ExchangeRate, FormulaConfig, FuelType } from "@/generated/prisma/client";

const TREND_WINDOW_DAYS = 21;

/**
 * The extra uncertainty margin layered on top of trend-projection error to
 * account for the formula itself being an approximation (see lib/formula.ts)
 * and for the government's ability to override formula output with ad hoc
 * subsidies. Widens the confidence band rather than pretending precision we
 * don't have.
 */
const FORMULA_UNCERTAINTY_MARGIN = 0.05;

export interface PredictionResult {
  fuelType: FuelType;
  predictedFor: Date;
  predictedPrice: number;
  lowerBound: number;
  upperBound: number;
  basisCrudePrice: number;
  basisExchangeRate: number;
  formulaConfigId: string;
  breakdown: FormulaBreakdown;
}

interface TrendBasis {
  crudeTrend: LinearTrend;
  rateTrend: LinearTrend;
}

/**
 * Crude oil and exchange rate trends don't depend on fuel type, so they're
 * fetched and fit once and reused across every fuel type and horizon a
 * caller asks for, instead of once per (fuelType, targetDate) pair.
 */
async function getTrendBasis(): Promise<TrendBasis | null> {
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - TREND_WINDOW_DAYS);

  const [crudePrices, exchangeRates] = await Promise.all([
    prisma.crudeOilPrice.findMany({
      where: { benchmark: "BRENT", date: { gte: windowStart } },
      orderBy: { date: "asc" },
    }),
    prisma.exchangeRate.findMany({
      where: { date: { gte: windowStart } },
      orderBy: { date: "asc" },
    }),
  ]);

  if (crudePrices.length < 2 || exchangeRates.length < 2) {
    return null;
  }

  const crudePoints: TimeSeriesPoint[] = crudePrices.map((p: CrudeOilPrice) => ({
    date: p.date,
    value: Number(p.pricePerBarrel),
  }));
  const ratePoints: TimeSeriesPoint[] = exchangeRates.map((r: ExchangeRate) => ({
    date: r.date,
    value: Number(r.usdToLkr),
  }));

  return {
    crudeTrend: fitLinearTrend(crudePoints),
    rateTrend: fitLinearTrend(ratePoints),
  };
}

function predictAtDate(
  fuelType: FuelType,
  targetDate: Date,
  basis: TrendBasis,
  formulaConfig: FormulaConfig
): PredictionResult {
  const { crudeTrend, rateTrend } = basis;

  const basisCrudePrice = projectTrend(crudeTrend, targetDate);
  const basisExchangeRate = projectTrend(rateTrend, targetDate);

  const { price, breakdown } = calculateFormulaPrice(
    formulaConfig,
    basisCrudePrice,
    basisExchangeRate
  );

  // Propagate trend uncertainty (1 residual stddev on each input) plus the
  // fixed formula-approximation margin into a band around the point estimate.
  const highCrude = basisCrudePrice + crudeTrend.residualStdDev;
  const lowCrude = basisCrudePrice - crudeTrend.residualStdDev;
  const highRate = basisExchangeRate + rateTrend.residualStdDev;
  const lowRate = basisExchangeRate - rateTrend.residualStdDev;

  const highEstimate = calculateFormulaPrice(formulaConfig, highCrude, highRate).price;
  const lowEstimate = calculateFormulaPrice(formulaConfig, lowCrude, lowRate).price;

  const lowerBound = Math.min(lowEstimate, highEstimate) * (1 - FORMULA_UNCERTAINTY_MARGIN);
  const upperBound = Math.max(lowEstimate, highEstimate) * (1 + FORMULA_UNCERTAINTY_MARGIN);

  return {
    fuelType,
    predictedFor: targetDate,
    predictedPrice: price,
    lowerBound,
    upperBound,
    basisCrudePrice,
    basisExchangeRate,
    formulaConfigId: formulaConfig.id,
    breakdown,
  };
}

/** Predicts one fuel type's price at several target dates in one pass. */
export async function predictFuelPriceAtDates(
  fuelType: FuelType,
  targetDates: Date[]
): Promise<(PredictionResult | null)[]> {
  const [basis, formulaConfigs] = await Promise.all([
    getTrendBasis(),
    prisma.formulaConfig.findMany({ where: { fuelType }, orderBy: { effectiveFrom: "desc" } }),
  ]);

  if (!basis) return targetDates.map(() => null);

  return targetDates.map((targetDate) => {
    const config = formulaConfigs.find(
      (c: FormulaConfig) =>
        c.effectiveFrom <= targetDate && (!c.effectiveTo || c.effectiveTo >= targetDate)
    );
    return config ? predictAtDate(fuelType, targetDate, basis, config) : null;
  });
}

export async function predictFuelPrice(
  fuelType: FuelType,
  targetDate: Date
): Promise<PredictionResult | null> {
  const [result] = await predictFuelPriceAtDates(fuelType, [targetDate]);
  return result;
}
