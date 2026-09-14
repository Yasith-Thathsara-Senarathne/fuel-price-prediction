import { prisma } from "@/lib/prisma";
import type { FuelPrice, FuelType, PriceSource } from "@/generated/prisma/client";

/**
 * CPC and Lanka IOC sometimes both have a row for the same effective date.
 * They usually agree, but not always — e.g. Lanka IOC's own "Super Diesel"
 * product is priced independently of CPC's regulated Super Diesel and can
 * differ by over Rs. 100. Charting both as separate points on the same date
 * would zigzag, so history/current-price views collapse to one row per
 * date, preferring the live-scraped Lanka IOC figure.
 */
const SOURCE_PRIORITY: PriceSource[] = ["LANKA_IOC", "CPC"];

function dedupeByDate(rows: FuelPrice[]): FuelPrice[] {
  const byDate = new Map<string, FuelPrice>();
  for (const row of rows) {
    const key = row.effectiveDate.toISOString();
    const existing = byDate.get(key);
    if (!existing || SOURCE_PRIORITY.indexOf(row.source) < SOURCE_PRIORITY.indexOf(existing.source)) {
      byDate.set(key, row);
    }
  }
  return Array.from(byDate.values()).sort(
    (a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime()
  );
}

export async function getLatestPrice(fuelType: FuelType): Promise<FuelPrice | null> {
  const rows = await prisma.fuelPrice.findMany({ where: { fuelType } });
  const deduped = dedupeByDate(rows);
  return deduped[deduped.length - 1] ?? null;
}

export async function getPriceHistory(
  fuelType: FuelType,
  limit = 60
): Promise<FuelPrice[]> {
  const rows = await prisma.fuelPrice.findMany({ where: { fuelType } });
  const deduped = dedupeByDate(rows);
  return deduped.slice(-limit);
}
