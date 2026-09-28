import { prisma } from "@/lib/prisma";
import { scrapeLankaIocPrices } from "@/lib/scrapers/lankaIoc";
import { scrapeCbslExchangeRates } from "@/lib/scrapers/cbsl";
import { scrapeBrentPrices, scrapeWtiPrices } from "@/lib/scrapers/crudeOil";
import type { CrudeBenchmark, FuelType, PriceSource } from "@/generated/prisma/client";
import { scrapeCpcPrices } from "@/lib/scrapers/cpc";

async function runSource(source: string, fn: () => Promise<number>) {
  try {
    const itemsFetched = await fn();
    await prisma.ingestionLog.create({
      data: { source, status: "SUCCESS", itemsFetched },
    });
    return { source, status: "SUCCESS" as const, itemsFetched };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.ingestionLog.create({
      data: { source, status: "FAILURE", message },
    });
    return { source, status: "FAILURE" as const, message };
  }
}

async function ingestFuelPrices(
  source: PriceSource,
  scrape: () => Promise<{ fuelType: FuelType; pricePerLitre: number; effectiveDate: Date }[]>
) {
  const prices = await scrape();
  for (const p of prices) {
    await prisma.fuelPrice.upsert({
      where: {
        fuelType_source_effectiveDate: {
          fuelType: p.fuelType,
          source,
          effectiveDate: p.effectiveDate,
        },
      },
      create: {
        fuelType: p.fuelType,
        source,
        effectiveDate: p.effectiveDate,
        pricePerLitre: p.pricePerLitre,
      },
      update: { pricePerLitre: p.pricePerLitre },
    });
  }
  return prices.length;
}

async function ingestCbsl() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);

  const rates = await scrapeCbslExchangeRates(start, end);
  for (const r of rates) {
    await prisma.exchangeRate.upsert({
      where: { date: r.date },
      create: { date: r.date, usdToLkr: r.usdToLkr, source: "CBSL" },
      update: { usdToLkr: r.usdToLkr },
    });
  }
  return rates.length;
}

async function ingestCrudeOil(
  benchmark: CrudeBenchmark,
  scrape: (since: Date) => Promise<{ date: Date; benchmark: CrudeBenchmark; pricePerBarrel: number }[]>
) {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const prices = await scrape(since);
  for (const p of prices) {
    await prisma.crudeOilPrice.upsert({
      where: { date_benchmark: { date: p.date, benchmark } },
      create: {
        date: p.date,
        benchmark,
        pricePerBarrel: p.pricePerBarrel,
        source: "EIA",
      },
      update: { pricePerBarrel: p.pricePerBarrel },
    });
  }
  return prices.length;
}

export type IngestionResult = Awaited<ReturnType<typeof runSource>>;

/** Runs every source ingester in parallel, logging each outcome to IngestionLog. */
export async function runIngestion() {
  const results = await Promise.all([
    runSource("LANKA_IOC", () => ingestFuelPrices("LANKA_IOC", scrapeLankaIocPrices)),
    runSource("CBSL", ingestCbsl),
    runSource("EIA_BRENT", () => ingestCrudeOil("BRENT", scrapeBrentPrices)),
    runSource("EIA_WTI", () => ingestCrudeOil("WTI", scrapeWtiPrices)),
    runSource("CPC", () => ingestFuelPrices("CPC", scrapeCpcPrices)),
  ]);

  return { ranAt: new Date().toISOString(), results };
}
