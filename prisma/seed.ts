import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * Best-effort FormulaConfig seed values for the CPC cost-reflective pricing
 * formula (see src/lib/formula.ts). CPC has never published a clean
 * machine-readable schedule of these constants, so the excise duty figures
 * below were back-solved to roughly reproduce real Lanka IOC retail prices
 * observed on 2026-08-31 (Petrol 92/95) and 2026-06-29 (Auto/Super Diesel)
 * at a Brent price of ~$102.5/barrel and a USD/LKR rate of ~328.68 — NOT
 * copied from an official source. Treat as a starting point to refine via
 * the admin UI, not ground truth. VAT 18% and PAL 0% reflect the
 * 1 Jan 2024 tax change (VAT introduced on fuel, PAL rescinded).
 */
const EFFECTIVE_FROM = new Date("2024-01-01T00:00:00Z");

const COMMON = {
  effectiveFrom: EFFECTIVE_FROM,
  vatRate: 0.18,
  palRate: 0,
  portHandlingPerLitre: 2,
  dealerMarginPerLitre: 7,
  distributionMarginPerLitre: 3,
  freightInsurancePerBarrel: 4,
  supplierPremiumPerBarrel: 3,
  source:
    "Back-solved from Lanka IOC retail prices (lankaioc.com/our-product/, observed 2026-09-14) — approximation, not an official CPC figure.",
};

const FORMULA_SEEDS = [
  {
    fuelType: "PETROL_92" as const,
    exciseDutyPerLitre: 100,
    notes: "Calibrated against Rs. 399.00/L effective 31-Aug-2026.",
  },
  {
    fuelType: "PETROL_95" as const,
    exciseDutyPerLitre: 164,
    notes: "Calibrated against Rs. 475.00/L effective 31-Aug-2026.",
  },
  {
    fuelType: "AUTO_DIESEL" as const,
    exciseDutyPerLitre: 85,
    notes: "Calibrated against Rs. 382.00/L effective 29-Jun-2026.",
  },
  {
    fuelType: "SUPER_DIESEL" as const,
    exciseDutyPerLitre: 270,
    notes: "Calibrated against Rs. 600.00/L effective 29-Jun-2026.",
  },
];

async function main() {
  for (const seed of FORMULA_SEEDS) {
    await prisma.formulaConfig.upsert({
      where: {
        // No natural unique key beyond id, so guard against re-running the
        // seed by checking for an existing row with the same fuelType + effectiveFrom.
        id:
          (
            await prisma.formulaConfig.findFirst({
              where: { fuelType: seed.fuelType, effectiveFrom: EFFECTIVE_FROM },
              select: { id: true },
            })
          )?.id ?? "___none___",
      },
      create: { ...COMMON, ...seed },
      update: { ...COMMON, ...seed },
    });
    console.log(`Seeded FormulaConfig for ${seed.fuelType}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
