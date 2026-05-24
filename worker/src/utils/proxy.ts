import { ProxyAgent } from "undici";
import { config } from "../config.js";

export function buildPlaywrightProxy() {
  if (!config.proxyUrl) return undefined;
  const url = new URL(config.proxyUrl);
  return {
    server: `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ""}`,
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
  };
}

export function buildFetchProxyDispatcher() {
  return config.proxyUrl ? new ProxyAgent(config.proxyUrl) : undefined;
}
