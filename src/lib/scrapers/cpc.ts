import type { FuelType } from "@/generated/prisma/client";

const SOURCE_URL = "https://ceypetco.gov.lk/marketing-sales/";

export interface ScrapedFuelPrice {
  fuelType: FuelType;
  pricePerLitre: number;
  effectiveDate: Date;
}

/**
 * CPC (ceypetco.gov.lk) is the primary retailer and the site the pricing
 * formula is actually built around, but as of this writing the domain is
 * unreliable — it times out far more often than not (confirmed independently
 * during research and again while building this scraper) and its markup has
 * never been inspectable long enough to write a real parser against.
 *
 * This function is intentionally a stub that fails loudly rather than
 * fabricating a parser for markup nobody has seen. Until the site is
 * reachable long enough to inspect: rely on Lanka IOC (see lankaIoc.ts) as
 * the live price source — CPC and LIOC prices track each other within a day
 * or two — and use the admin UI to manually enter official CPC prices when
 * they're announced (e.g. from news coverage) so `source: CPC` rows exist
 * for historical accuracy.
 */
export async function scrapeCpcPrices(): Promise<ScrapedFuelPrice[]> {
  const response = await fetch(SOURCE_URL, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FuelPricePredictionBot/1.0)" },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`CPC fetch failed with status ${response.status}`);
  }

  throw new Error(
    "CPC scraper not implemented — site markup has not been inspectable. " +
      "Enter CPC prices via the admin UI instead."
  );
}
