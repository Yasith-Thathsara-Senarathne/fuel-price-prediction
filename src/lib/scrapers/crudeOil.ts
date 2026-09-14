import * as cheerio from "cheerio";
import type { CrudeBenchmark } from "@/generated/prisma/client";

export interface ScrapedCrudePrice {
  date: Date;
  benchmark: CrudeBenchmark;
  pricePerBarrel: number;
}

const SOURCE_URLS: Record<"BRENT" | "WTI", string> = {
  BRENT: "https://www.eia.gov/dnav/pet/hist/RBRTED.htm",
  WTI: "https://www.eia.gov/dnav/pet/hist/RWTCD.htm",
};

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/**
 * EIA's "Week Of" tables (e.g. "2026 Aug-31 to Sep- 4") only need their start
 * date — each of the 5 weekday columns is start-date + 0..4 days, and JS Date
 * arithmetic rolls month/year boundaries automatically, so the "to ..." half
 * of the label is redundant and never parsed.
 */
function parseWeekStart(label: string): { year: number; month: number; day: number } | null {
  const match = label.match(/(\d{4})\s+([A-Za-z]{3})-\s*(\d{1,2})\s+to/);
  if (!match) return null;
  const [, yearStr, monStr, dayStr] = match;
  const month = MONTHS[monStr.toLowerCase()];
  if (month === undefined) return null;
  return { year: Number(yearStr), month, day: Number(dayStr) };
}

/**
 * Scrapes EIA's free public "Week Of" daily spot price tables (no API key
 * needed — these are the plain HTML pages behind eia.gov/dnav, not the
 * eia.gov/opendata API). Brent is CPC's formula proxy (see formula.ts); WTI
 * is stored alongside it for reference since both are free from the same
 * source. Neither is the Singapore Platts benchmark CPC's formula actually
 * uses — no free feed for that exists.
 */
async function scrapeWeeklyTable(
  url: string,
  benchmark: CrudeBenchmark,
  sinceDate: Date
): Promise<ScrapedCrudePrice[]> {
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FuelPricePredictionBot/1.0)" },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`EIA ${benchmark} fetch failed with status ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const table = $("table")
    .filter((_, el) => $(el).find("tr").first().find("th,td").first().text().trim() === "Week Of")
    .first();

  if (table.length === 0) {
    throw new Error(`EIA ${benchmark} page structure may have changed — data table not found`);
  }

  const results: ScrapedCrudePrice[] = [];

  table
    .find("tr")
    .slice(1)
    .each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length < 6) return;

      const start = parseWeekStart($(cells[0]).text().trim());
      if (!start) return;

      for (let i = 0; i < 5; i++) {
        const text = $(cells[i + 1]).text().trim();
        if (!text) continue; // holiday / no trading / not yet published

        const price = Number(text);
        if (!Number.isFinite(price)) continue;

        const date = new Date(Date.UTC(start.year, start.month, start.day + i));
        if (date >= sinceDate) {
          results.push({ date, benchmark, pricePerBarrel: price });
        }
      }
    });

  if (results.length === 0) {
    throw new Error(`EIA ${benchmark}: no prices found within the requested date range`);
  }

  return results;
}

export function scrapeBrentPrices(sinceDate: Date): Promise<ScrapedCrudePrice[]> {
  return scrapeWeeklyTable(SOURCE_URLS.BRENT, "BRENT", sinceDate);
}

export function scrapeWtiPrices(sinceDate: Date): Promise<ScrapedCrudePrice[]> {
  return scrapeWeeklyTable(SOURCE_URLS.WTI, "WTI", sinceDate);
}
