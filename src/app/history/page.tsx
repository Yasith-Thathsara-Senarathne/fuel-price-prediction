import { getPriceHistory } from "@/lib/currentPrices";
import { FUEL_TYPE_LABELS, TRACKED_FUEL_TYPES } from "@/lib/fuelTypes";
import { PriceHistoryChart } from "@/components/PriceHistoryChart";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const series = await Promise.all(
    TRACKED_FUEL_TYPES.map(async (fuelType) => {
      const rows = await getPriceHistory(fuelType);
      return {
        fuelType,
        points: rows.map((r) => ({
          date: r.effectiveDate.toISOString().slice(0, 10),
          price: Number(r.pricePerLitre),
        })),
      };
    })
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Price History</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Retail price per litre over time, as announced by Lanka IOC and CPC.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {series.map(({ fuelType, points }) => (
          <div
            key={fuelType}
            className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <PriceHistoryChart title={FUEL_TYPE_LABELS[fuelType]} points={points} />
          </div>
        ))}
      </div>
    </div>
  );
}
