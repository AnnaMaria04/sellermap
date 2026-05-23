import assert from "node:assert/strict";
import test from "node:test";

test("own collector provider is unavailable when env is missing", async () => {
  const oldBase = process.env.OWN_WB_COLLECTOR_BASE_URL;
  const oldKey = process.env.OWN_WB_COLLECTOR_API_KEY;
  delete process.env.OWN_WB_COLLECTOR_BASE_URL;
  delete process.env.OWN_WB_COLLECTOR_API_KEY;
  const { isOwnCollectorConfigured } = await import("../src/lib/providers/market/own-wb-client");
  assert.equal(isOwnCollectorConfigured(), false);
  process.env.OWN_WB_COLLECTOR_BASE_URL = oldBase;
  process.env.OWN_WB_COLLECTOR_API_KEY = oldKey;
});

test("own collector provider maps worker products", async () => {
  const oldBase = process.env.OWN_WB_COLLECTOR_BASE_URL;
  const oldKey = process.env.OWN_WB_COLLECTOR_API_KEY;
  process.env.OWN_WB_COLLECTOR_BASE_URL = "https://worker.test";
  process.env.OWN_WB_COLLECTOR_API_KEY = "secret";
  const oldFetch = global.fetch;
  global.fetch = (async () =>
    new Response(
      JSON.stringify({
        status: "success",
        source: "own-wb",
        query: "акриловый маркер",
        warnings: [],
        items: [
          {
            nmId: "123",
            title: "Акриловый маркер",
            priceRub: 299,
            reviewCount: 120,
            searchKeyword: "акриловый маркер",
            source: "own-wb",
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )) as typeof fetch;
  const { callOwnCollectorSearch } = await import("../src/lib/providers/market/own-wb-client");
  const result = await callOwnCollectorSearch("акриловый маркер", 10);
  const items = result.items;
  assert.equal(items[0]?.source, "own-wb");
  assert.equal(items[0]?.priceRub, 299);
  global.fetch = oldFetch;
  process.env.OWN_WB_COLLECTOR_BASE_URL = oldBase;
  process.env.OWN_WB_COLLECTOR_API_KEY = oldKey;
});
