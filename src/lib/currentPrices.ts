import { prisma } from "@/lib/prisma";
import type { FuelPrice, FuelType } from "@/generated/prisma/client";

export async function getLatestPrice(fuelType: FuelType): Promise<FuelPrice | null> {
  return prisma.fuelPrice.findFirst({
    where: { fuelType },
    orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }],
  });
}

export async function getPriceHistory(
  fuelType: FuelType,
  limit = 60
): Promise<FuelPrice[]> {
  const rows = await prisma.fuelPrice.findMany({
    where: { fuelType },
    orderBy: { effectiveDate: "desc" },
    take: limit,
  });
  return rows.reverse();
}
