import { type ChannelAdapter, type ChannelKind } from "./types";
import {
  yandexMarketAdapter,
  moyskladAdapter,
} from "./adapters/mock";
import { wildberriesAdapter } from "./adapters/wildberries";
import { ozonAdapter } from "./adapters/ozon";

/** Central registry mapping a channel kind to its adapter. Wildberries + Ozon
 *  are live adapters; Я.Маркет / МойСклад remain mock until implemented. */
export const ADAPTERS: Partial<Record<ChannelKind, ChannelAdapter>> = {
  wildberries: wildberriesAdapter,
  ozon: ozonAdapter,
  yandex_market: yandexMarketAdapter,
  moysklad: moyskladAdapter,
};

export function getAdapter(kind: ChannelKind): ChannelAdapter | undefined {
  return ADAPTERS[kind];
}

export const AVAILABLE_ADAPTERS = Object.values(ADAPTERS).filter(Boolean) as ChannelAdapter[];
