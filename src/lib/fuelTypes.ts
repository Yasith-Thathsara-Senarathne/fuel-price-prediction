import type { FuelType } from "@/generated/prisma/client";

export const TRACKED_FUEL_TYPES: FuelType[] = [
  "PETROL_92",
  "PETROL_95",
  "AUTO_DIESEL",
  "SUPER_DIESEL",
];

export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  PETROL_92: "Petrol 92",
  PETROL_95: "Petrol 95",
  AUTO_DIESEL: "Auto Diesel",
  SUPER_DIESEL: "Super Diesel",
  KEROSENE: "Kerosene",
};
