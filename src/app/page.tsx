import Link from "next/link";
import { getPriceHistory } from "@/lib/currentPrices";
import { predictFuelPriceAtDates } from "@/lib/prediction";
import { FUEL_TYPE_LABELS, TRACKED_FUEL_TYPES } from "@/lib/fuelTypes";
import { FuelCard, type HorizonPrediction } from "@/components/FuelCard";

export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-LK", { year: "numeric", month: "short", day: "numeric" });
}

const HORIZONS = [
  { key: "2w", label: "2W" },
  { key: "revision", label: "Revision" },
  { key: "3m", label: "3M" },
] as const;

const DEFAULT_HORIZON_INDEX = HORIZONS.findIndex((h) => h.key === "revision");

/**
 * Sri Lanka's CPC has traditionally revised fuel prices at month-end
 * midnight, effective the following month — though 2026 revisions have
 * become more irregular (see /methodology). The upcoming month-end is still
 * the most meaningful single date to predict for, so it's the default tab.
 */
function nextRevisionDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0);
}

function horizonDates(): Date[] {
  const twoWeeks = new Date();
  twoWeeks.setDate(twoWeeks.getDate() + 14);

  const threeMonths = new Date();
  threeMonths.setMonth(threeMonths.getMonth() + 3);

  return [twoWeeks, nextRevisionDate(), threeMonths];
}

export default async function DashboardPage() {
  const targetDates = horizonDates();

  const cards = await Promise.all(
    TRACKED_FUEL_TYPES.map(async (fuelType) => {
      const [history, predictions] = await Promise.all([
        getPriceHistory(fuelType, 14),
        predictFuelPriceAtDates(fuelType, targetDates),
      ]);

      const current = history[history.length - 1] ?? null;
      const previous = history.length > 1 ? history[history.length - 2] : null;

      const horizons: HorizonPrediction[] = HORIZONS.map((h, i) => {
        const result = predictions[i];
        return {
          key: h.key,
          label: h.label,
          dateLabel: formatDate(targetDates[i]),
          predictedPrice: result?.predictedPrice ?? null,
          lowerBound: result?.lowerBound ?? null,
          upperBound: result?.upperBound ?? null,
          breakdown: result
            ? {
                basisCrudePrice: result.breakdown.crudePricePerBarrelUsd,
                basisExchangeRate: result.breakdown.exchangeRateUsdToLkr,
                landedCostPerLitreLkr: result.breakdown.landedCostPerLitreLkr,
                portHandlingPerLitre: result.breakdown.portHandlingPerLitre,
                distributionMarginPerLitre: result.breakdown.distributionMarginPerLitre,
                dealerMarginPerLitre: result.breakdown.dealerMarginPerLitre,
                exciseDutyPerLitre: result.breakdown.exciseDutyPerLitre,
                preTaxPricePerLitre: result.breakdown.preTaxPricePerLitre,
                palRate: result.breakdown.palRate,
                vatRate: result.breakdown.vatRate,
              }
            : null,
        };
      });

      return {
        fuelType,
        current,
        previous,
        sparklinePoints: history.map((h) => Number(h.pricePerLitre)),
        horizons,
      };
    })
  );

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sri Lanka Fuel Prices</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Current retail prices with estimates for the next month-end revision (Sri
          Lanka&apos;s traditional pricing-change point), plus 2-week and 3-month views,
          based on the trend in global crude oil prices and the USD/LKR exchange rate run
          through an approximation of CPC&apos;s cost-reflective pricing formula.
          Predictions are estimates, not official announcements — see the{" "}
          <Link href="/methodology" className="underline underline-offset-2">
            methodology
          </Link>{" "}
          page for why.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ fuelType, current, previous, sparklinePoints, horizons }, index) => (
          <FuelCard
            key={fuelType}
            index={index}
            label={FUEL_TYPE_LABELS[fuelType]}
            currentPrice={current ? Number(current.pricePerLitre) : null}
            currentDateLabel={current ? formatDate(current.effectiveDate) : null}
            currentSource={current?.source ?? null}
            previousPrice={previous ? Number(previous.pricePerLitre) : null}
            sparklinePoints={sparklinePoints}
            horizons={horizons}
            defaultHorizonIndex={DEFAULT_HORIZON_INDEX}
          />
        ))}
      </div>
    </div>
  );
}
