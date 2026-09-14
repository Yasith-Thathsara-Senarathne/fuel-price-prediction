import * as cheerio from "cheerio";
import type { FuelType } from "@/generated/prisma/client";

const SOURCE_URL = "https://www.lankaioc.com/our-product/";

const FUEL_NAME_MAP: Record<string, FuelType> = {
  "lanka petrol 92": "PETROL_92",
  "95 octane": "PETROL_95",
  "lanka auto diesel": "AUTO_DIESEL",
  "lanka super diesel": "SUPER_DIESEL",
};

const MONTHS: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

export interface ScrapedFuelPrice {
  fuelType: FuelType;
  pricePerLitre: number;
  effectiveDate: Date;
}

/**
 * "31-August-2026 12.00 Midnight" -> Date(2026-08-31). Only the calendar date
 * is kept; Lanka IOC price changes always take effect at midnight.
 */
function parseEffectiveDate(text: string): Date | null {
  const match = text.match(/(\d{1,2})-([A-Za-z]+)-(\d{4})/);
  if (!match) return null;
  const [, day, monthName, year] = match;
  const month = MONTHS[monthName.toLowerCase()];
  if (month === undefined) return null;
  return new Date(Date.UTC(Number(year), month, Number(day)));
}

function parsePrice(text: string): number | null {
  const match = text.replace(/,/g, "").match(/([\d.]+)/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

export async function scrapeLankaIocPrices(): Promise<ScrapedFuelPrice[]> {
  const response = await fetch(SOURCE_URL, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FuelPricePredictionBot/1.0)" },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Lanka IOC fetch failed with status ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const results: ScrapedFuelPrice[] = [];

  $(".card-feature").each((_, el) => {
    const card = $(el);
    const name = card.find(".text-large").first().text().trim().toLowerCase();
    const fuelType = FUEL_NAME_MAP[name];
    if (!fuelType) return; // not one of the fuel types we track (e.g. Xtra Green, Industrial Diesel)

    const priceText = card.find("h4").first().text();
    const dateText = card.find(".small-feature-card-style").first().text();

    const pricePerLitre = parsePrice(priceText);
    const effectiveDate = parseEffectiveDate(dateText);

    if (pricePerLitre !== null && effectiveDate !== null) {
      results.push({ fuelType, pricePerLitre, effectiveDate });
    }
  });

  if (results.length === 0) {
    throw new Error("Lanka IOC page structure may have changed — no prices parsed");
  }

  return results;
}
