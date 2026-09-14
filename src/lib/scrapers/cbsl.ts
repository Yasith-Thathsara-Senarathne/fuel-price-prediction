import * as cheerio from "cheerio";

const RESULTS_URL =
  "https://www.cbsl.gov.lk/cbsl_custom/exrates/exrates_results_spot_mid.php";

export interface ScrapedExchangeRate {
  date: Date;
  usdToLkr: number;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Scrapes CBSL's legacy PHP lookup tool for the daily indicative USD/LKR spot
 * rate. There's no documented public API for this — the form posts to
 * exrates_results_spot_mid.php with a currency checkbox (chk_cur[]) plus a
 * date range, and only that combination returns data (bare startDate/endDate
 * params return "0 results"). Verified working manually on 2026-09-14;
 * CBSL could restructure this form without notice.
 */
export async function scrapeCbslExchangeRates(
  startDate: Date,
  endDate: Date
): Promise<ScrapedExchangeRate[]> {
  const body = new URLSearchParams({
    lookupPage: "lookup_daily_exchange_rates.php",
    startRange: "2006-11-11",
    rangeType: "dates",
    txtStart: formatDate(startDate),
    txtEnd: formatDate(endDate),
    "chk_cur[]": "USD~US Dollar",
    submit_button: "Submit",
  });

  const response = await fetch(RESULTS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (compatible; FuelPricePredictionBot/1.0)",
    },
    body: body.toString(),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`CBSL fetch failed with status ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const results: ScrapedExchangeRate[] = [];

  $("table.rates tbody tr").each((_, row) => {
    const cells = $(row).find("td");
    const dateText = $(cells[0]).text().trim();
    const rateText = $(cells[1]).text().trim();

    const date = new Date(`${dateText}T00:00:00Z`);
    const usdToLkr = Number(rateText);

    if (!Number.isNaN(date.getTime()) && Number.isFinite(usdToLkr)) {
      results.push({ date, usdToLkr });
    }
  });

  if (results.length === 0) {
    throw new Error("CBSL page structure may have changed — no rates parsed");
  }

  return results;
}
