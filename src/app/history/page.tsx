import { getPriceHistory } from "@/lib/currentPrices";
import { FUEL_TYPE_LABELS, TRACKED_FUEL_TYPES } from "@/lib/fuelTypes";
import { HistoryExplorer } from "@/components/HistoryExplorer";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const series = await Promise.all(
    TRACKED_FUEL_TYPES.map(async (fuelType) => {
      const rows = await getPriceHistory(fuelType, 365);
      return {
        fuelType,
        label: FUEL_TYPE_LABELS[fuelType],
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
        <p className="mt-2 text-sm text-muted">
          Retail price per litre over time, as announced by Lanka IOC and CPC.
        </p>
      </div>

      <HistoryExplorer series={series} />
    </div>
  );
}
