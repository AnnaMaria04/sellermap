import "server-only";

import { WB_API_BASES, wbFetch } from "./client";

export type WbTariffResponse = Record<string, unknown>;

export function getWbCommissionTariffs() {
  return wbFetch<WbTariffResponse>("/api/v1/tariffs/commission", {
    baseUrl: WB_API_BASES.tariffs,
  });
}

export function getWbBoxTariffs(date = new Date().toISOString().slice(0, 10)) {
  return wbFetch<WbTariffResponse>("/api/v1/tariffs/box", {
    baseUrl: WB_API_BASES.tariffs,
    query: { date },
  });
}

export function getWbPalletTariffs(date = new Date().toISOString().slice(0, 10)) {
  return wbFetch<WbTariffResponse>("/api/v1/tariffs/pallet", {
    baseUrl: WB_API_BASES.tariffs,
    query: { date },
  });
}

export function getWbAcceptanceCoefficients() {
  return wbFetch<WbTariffResponse>("/api/tariffs/v1/acceptance/coefficients", {
    baseUrl: WB_API_BASES.tariffs,
  });
}

export function getWbReturnTariffs(date = new Date().toISOString().slice(0, 10)) {
  return wbFetch<WbTariffResponse>("/api/v1/tariffs/return", {
    baseUrl: WB_API_BASES.tariffs,
    query: { date },
  });
}

