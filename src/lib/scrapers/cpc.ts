import * as cheerio from "cheerio";
import type { FuelType } from "@/generated/prisma/client";

const SOURCE_URL = "https://ceypetco.gov.lk/marketing-sales/";

/** Exact card titles; anything else (Industrial Kerosene, black oils) is skipped. */
const FUEL_NAME_MAP: Record<string, FuelType> = {
  "lanka petrol 92 octane": "PETROL_92",
  "lanka petrol 95 octane euro 4": "PETROL_95",
  "lanka auto diesel": "AUTO_DIESEL",
  "lanka super diesel 4 star euro 4": "SUPER_DIESEL",
  "lanka kerosene": "KEROSENE",
};

export interface ScrapedFuelPrice {
  fuelType: FuelType;
  pricePerLitre: number;
  effectiveDate: Date;
}

/**
 * "Effect from: 30-08-2026 12.00 Midnight" -> Date(2026-08-30). Only the
 * calendar date is kept, matching how Lanka IOC dates are stored.
 */
function parseEffectiveDate(text: string): Date | null {
  const match = text.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (!match) return null;
  const [, day, month, year] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

function parsePrice(text: string): number | null {
  const match = text.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

/**
 * Scrapes CPC's marketing-sales page, which renders each product as a
 * `.price-card` with the name in `.fuel-name`, the price as a bare text node
 * inside `.price-value`, and the date in `.effective-date`. The domain has
 * historically been flaky, so failures here are expected occasionally —
 * Lanka IOC remains the fallback live source.
 */
export async function scrapeCpcPrices(): Promise<ScrapedFuelPrice[]> {
  const response = await fetch(SOURCE_URL, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FuelPricePredictionBot/1.0)" },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`CPC fetch failed with status ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const results: ScrapedFuelPrice[] = [];

  $(".price-card").each((_, el) => {
    const card = $(el);
    const name = card.find(".fuel-name").first().text().trim().toLowerCase();
    const fuelType = FUEL_NAME_MAP[name];
    if (!fuelType) return;

    const priceValue = card.find(".price-value").first().clone();
    priceValue.find(".price-currency, .price-unit").remove();

    const pricePerLitre = parsePrice(priceValue.text());
    const effectiveDate = parseEffectiveDate(card.find(".effective-date").first().text());

    if (pricePerLitre !== null && effectiveDate !== null) {
      results.push({ fuelType, pricePerLitre, effectiveDate });
    }
  });

  if (results.length === 0) {
    throw new Error("CPC page structure may have changed — no prices parsed");
  }

  return results;
}
