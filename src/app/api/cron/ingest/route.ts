import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scrapeLankaIocPrices } from "@/lib/scrapers/lankaIoc";
import { scrapeCbslExchangeRates } from "@/lib/scrapers/cbsl";
import { fetchBrentPrices } from "@/lib/scrapers/crudeOil";
import { scrapeCpcPrices } from "@/lib/scrapers/cpc";

export const dynamic = "force-dynamic";

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

async function ingestLankaIoc() {
  const prices = await scrapeLankaIocPrices();
  for (const p of prices) {
    await prisma.fuelPrice.upsert({
      where: {
        fuelType_source_effectiveDate: {
          fuelType: p.fuelType,
          source: "LANKA_IOC",
          effectiveDate: p.effectiveDate,
        },
      },
      create: {
        fuelType: p.fuelType,
        source: "LANKA_IOC",
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

async function ingestCrudeOil() {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const prices = await fetchBrentPrices(since);
  for (const p of prices) {
    await prisma.crudeOilPrice.upsert({
      where: { date_benchmark: { date: p.date, benchmark: "BRENT" } },
      create: {
        date: p.date,
        benchmark: "BRENT",
        pricePerBarrel: p.pricePerBarrel,
        source: "EIA",
      },
      update: { pricePerBarrel: p.pricePerBarrel },
    });
  }
  return prices.length;
}

async function ingestCpc() {
  const prices = await scrapeCpcPrices();
  return prices.length;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await Promise.all([
    runSource("LANKA_IOC", ingestLankaIoc),
    runSource("CBSL", ingestCbsl),
    runSource("EIA", ingestCrudeOil),
    runSource("CPC", ingestCpc),
  ]);

  return NextResponse.json({ ranAt: new Date().toISOString(), results });
}
