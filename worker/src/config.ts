import "dotenv/config";
import type { CollectorConfig } from "./types.js";

function numberEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getConfig(): CollectorConfig {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const apiKey = process.env.WORKER_API_KEY ?? null;
  if (nodeEnv === "production" && !apiKey) {
    throw new Error("WORKER_API_KEY is required in production.");
  }
  return {
    port: numberEnv("PORT", 8787),
    apiKey,
    nodeEnv,
    maxConcurrency: numberEnv("WB_COLLECTOR_MAX_CONCURRENCY", 1),
    delayMs: numberEnv("WB_COLLECTOR_DELAY_MS", 3000),
    timeoutMs: numberEnv("WB_COLLECTOR_TIMEOUT_MS", 25000),
    maxResults: numberEnv("WB_COLLECTOR_MAX_RESULTS", 30),
    userAgent: process.env.WB_COLLECTOR_USER_AGENT ?? "SellerMapBot/0.1 contact: support@sellermap.local",
    proxyUrl: process.env.WB_COLLECTOR_PROXY_URL ?? null,
  };
}

export const config = getConfig();
