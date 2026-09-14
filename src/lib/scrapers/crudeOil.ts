export interface ScrapedCrudePrice {
  date: Date;
  pricePerBarrel: number;
}

/**
 * Brent daily spot price (series PET.RBRTE.D) from the EIA Open Data API.
 * This is a proxy for the Singapore Platts benchmark CPC's formula actually
 * uses (no free feed exists for that), but Brent and Singapore Platts prices
 * are highly correlated, so it's the best free input available. Requires a
 * free API key from https://www.eia.gov/opendata/register.php.
 */
export async function fetchBrentPrices(sinceDate: Date): Promise<ScrapedCrudePrice[]> {
  const apiKey = process.env.EIA_API_KEY;
  if (!apiKey) {
    throw new Error("EIA_API_KEY is not set");
  }

  const start = sinceDate.toISOString().slice(0, 10);
  const url = new URL("https://api.eia.gov/v2/petroleum/pri/spt/data/");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("frequency", "daily");
  url.searchParams.set("data[0]", "value");
  url.searchParams.set("facets[series][]", "RBRTE");
  url.searchParams.set("start", start);
  url.searchParams.set("sort[0][column]", "period");
  url.searchParams.set("sort[0][direction]", "asc");
  url.searchParams.set("length", "5000");

  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) {
    throw new Error(`EIA API fetch failed with status ${response.status}`);
  }

  const json = (await response.json()) as {
    response?: { data?: Array<{ period: string; value: string | number }> };
  };

  const rows = json.response?.data ?? [];
  if (rows.length === 0) {
    throw new Error("EIA API returned no data — check series id and API key");
  }

  return rows
    .map((row) => ({
      date: new Date(`${row.period}T00:00:00Z`),
      pricePerBarrel: Number(row.value),
    }))
    .filter((row) => Number.isFinite(row.pricePerBarrel));
}
