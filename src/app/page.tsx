import Link from "next/link";
import { getLatestPrice } from "@/lib/currentPrices";
import { predictFuelPrice } from "@/lib/prediction";
import { FUEL_TYPE_LABELS, TRACKED_FUEL_TYPES } from "@/lib/fuelTypes";

export const dynamic = "force-dynamic";

function formatLkr(value: number): string {
  return `Rs. ${value.toFixed(2)}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-LK", { year: "numeric", month: "short", day: "numeric" });
}

export default async function DashboardPage() {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 14);

  const cards = await Promise.all(
    TRACKED_FUEL_TYPES.map(async (fuelType) => {
      const [current, prediction] = await Promise.all([
        getLatestPrice(fuelType),
        predictFuelPrice(fuelType, targetDate),
      ]);
      return { fuelType, current, prediction };
    })
  );

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sri Lanka Fuel Prices</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Current retail prices and a {14}-day estimate based on the trend in global
          crude oil prices and the USD/LKR exchange rate, run through an approximation
          of CPC&apos;s cost-reflective pricing formula. Predictions are estimates, not
          official announcements — see the{" "}
          <Link href="/methodology" className="underline">
            methodology
          </Link>{" "}
          page for why.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ fuelType, current, prediction }) => (
          <div
            key={fuelType}
            className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="text-sm font-medium text-zinc-500">
              {FUEL_TYPE_LABELS[fuelType]}
            </div>

            {current ? (
              <>
                <div className="mt-2 text-2xl font-semibold">
                  {formatLkr(Number(current.pricePerLitre))}
                </div>
                <div className="text-xs text-zinc-500">
                  as of {formatDate(current.effectiveDate)} ({current.source})
                </div>
              </>
            ) : (
              <div className="mt-2 text-sm text-zinc-400">No price data yet</div>
            )}

            <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <div className="text-xs font-medium text-zinc-500">
                Estimate for {formatDate(targetDate)}
              </div>
              {prediction ? (
                <>
                  <div className="mt-1 text-lg font-semibold text-emerald-700 dark:text-emerald-400">
                    {formatLkr(prediction.predictedPrice)}
                  </div>
                  <div className="text-xs text-zinc-500">
                    range {formatLkr(prediction.lowerBound)} – {formatLkr(prediction.upperBound)}
                  </div>
                </>
              ) : (
                <div className="mt-1 text-sm text-zinc-400">
                  Not enough data yet — run ingestion first
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
