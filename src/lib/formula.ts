import type { FormulaConfig } from "@/generated/prisma/client";

const LITRES_PER_BARREL = 158.987;

export interface FormulaBreakdown {
  crudePricePerBarrelUsd: number;
  exchangeRateUsdToLkr: number;
  landedCostPerBarrelUsd: number;
  landedCostPerLitreLkr: number;
  portHandlingPerLitre: number;
  distributionMarginPerLitre: number;
  dealerMarginPerLitre: number;
  exciseDutyPerLitre: number;
  preTaxPricePerLitre: number;
  palRate: number;
  vatRate: number;
  finalPricePerLitre: number;
}

/**
 * Approximates Sri Lanka's CPC cost-reflective pricing formula. CPC has never
 * published a single authoritative equation, so this is a best-effort model
 * built from public reporting (Verite Research / publicfinance.lk methodology
 * notes, Daily FT/EconomyNext coverage) — treat output as an estimate, not a
 * replica of CPC's internal calculation. `config` carries the versioned,
 * manually-maintained tax/margin figures this approximation depends on.
 */
export function calculateFormulaPrice(
  config: Pick<
    FormulaConfig,
    | "vatRate"
    | "exciseDutyPerLitre"
    | "palRate"
    | "portHandlingPerLitre"
    | "distributionMarginPerLitre"
    | "dealerMarginPerLitre"
    | "freightInsurancePerBarrel"
    | "supplierPremiumPerBarrel"
  >,
  crudePricePerBarrelUsd: number,
  exchangeRateUsdToLkr: number
): { price: number; breakdown: FormulaBreakdown } {
  const landedCostPerBarrelUsd =
    crudePricePerBarrelUsd +
    Number(config.supplierPremiumPerBarrel) +
    Number(config.freightInsurancePerBarrel);

  const landedCostPerLitreLkr =
    (landedCostPerBarrelUsd / LITRES_PER_BARREL) * exchangeRateUsdToLkr;

  const preTaxPricePerLitre =
    landedCostPerLitreLkr +
    Number(config.portHandlingPerLitre) +
    Number(config.distributionMarginPerLitre) +
    Number(config.dealerMarginPerLitre) +
    Number(config.exciseDutyPerLitre);

  const palRate = Number(config.palRate);
  const vatRate = Number(config.vatRate);

  const priceWithPal = preTaxPricePerLitre * (1 + palRate);
  const finalPricePerLitre = priceWithPal * (1 + vatRate);

  return {
    price: finalPricePerLitre,
    breakdown: {
      crudePricePerBarrelUsd,
      exchangeRateUsdToLkr,
      landedCostPerBarrelUsd,
      landedCostPerLitreLkr,
      portHandlingPerLitre: Number(config.portHandlingPerLitre),
      distributionMarginPerLitre: Number(config.distributionMarginPerLitre),
      dealerMarginPerLitre: Number(config.dealerMarginPerLitre),
      exciseDutyPerLitre: Number(config.exciseDutyPerLitre),
      preTaxPricePerLitre,
      palRate,
      vatRate,
      finalPricePerLitre,
    },
  };
}
