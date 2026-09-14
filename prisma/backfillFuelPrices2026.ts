import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * Confirmed 2026 CPC price revisions, sourced from energymin.gov.lk's own
 * gazette posts (Jan 5, Jan 31, Feb 28 — fetched directly, with exact
 * "current price"/"revised price" tables) and cross-checked news coverage
 * (Mar 21, May 3, May 30, Jun 29, Jul 31 "unchanged", Aug 31 — each
 * confirmed against the following entry's stated prior price for
 * continuity). One gap is known and left out rather than guessed: between
 * Mar 21 and May 3, at least one more revision happened that wasn't found.
 *
 * All four values are given at every date (including fuel types the
 * announcement didn't mention) so each row reflects the actual price in
 * effect that day, not just what changed.
 */
const REVISIONS: {
  date: string;
  PETROL_92: number;
  PETROL_95: number;
  AUTO_DIESEL: number;
  SUPER_DIESEL: number;
}[] = [
  { date: "2026-01-05", PETROL_92: 294, PETROL_95: 340, AUTO_DIESEL: 279, SUPER_DIESEL: 323 },
  { date: "2026-01-31", PETROL_92: 292, PETROL_95: 340, AUTO_DIESEL: 277, SUPER_DIESEL: 323 },
  { date: "2026-02-28", PETROL_92: 293, PETROL_95: 340, AUTO_DIESEL: 281, SUPER_DIESEL: 329 },
  { date: "2026-03-21", PETROL_92: 365, PETROL_95: 420, AUTO_DIESEL: 351, SUPER_DIESEL: 421 },
  { date: "2026-05-03", PETROL_92: 410, PETROL_95: 470, AUTO_DIESEL: 392, SUPER_DIESEL: 458 },
  { date: "2026-05-30", PETROL_92: 434, PETROL_95: 495, AUTO_DIESEL: 407, SUPER_DIESEL: 478 },
  { date: "2026-06-29", PETROL_92: 414, PETROL_95: 495, AUTO_DIESEL: 382, SUPER_DIESEL: 478 },
  { date: "2026-07-31", PETROL_92: 414, PETROL_95: 495, AUTO_DIESEL: 382, SUPER_DIESEL: 478 },
  { date: "2026-08-31", PETROL_92: 399, PETROL_95: 475, AUTO_DIESEL: 382, SUPER_DIESEL: 478 },
];

const FUEL_TYPES = ["PETROL_92", "PETROL_95", "AUTO_DIESEL", "SUPER_DIESEL"] as const;

async function main() {
  let count = 0;
  for (const revision of REVISIONS) {
    const effectiveDate = new Date(`${revision.date}T00:00:00Z`);
    for (const fuelType of FUEL_TYPES) {
      await prisma.fuelPrice.upsert({
        where: {
          fuelType_source_effectiveDate: { fuelType, source: "CPC", effectiveDate },
        },
        create: {
          fuelType,
          source: "CPC",
          effectiveDate,
          pricePerLitre: revision[fuelType],
        },
        update: { pricePerLitre: revision[fuelType] },
      });
      count++;
    }
  }
  console.log(`Backfilled ${count} CPC price rows across ${REVISIONS.length} revision dates.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
