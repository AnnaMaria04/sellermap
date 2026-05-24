import asyncio
import json
import os
import random
import sys
import time
from urllib.parse import quote, urlparse, urlunparse
from typing import Any

from curl_cffi.requests import AsyncSession


WB_SEARCH_BASE = "https://search.wb.ru/exactmatch/ru/common/v18/search"
WB_DEST = "-1257786"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json,text/plain,*/*",
    "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
    "Origin": "https://www.wildberries.ru",
}


def build_params(query: str, limit: int) -> dict[str, Any]:
    return {
        "appType": "1",
        "curr": "rub",
        "dest": WB_DEST,
        "lang": "ru",
        "page": "1",
        "query": query,
        "resultset": "catalog",
        "sort": "popular",
        "spp": "30",
        "suppressSpellcheck": "false",
        "inheritFilters": "false",
        "limit": str(limit),
    }


def proxy_candidates(proxy: str | None) -> list[str | None]:
    if not proxy:
        return [None]
    candidates = [proxy]
    parsed = urlparse(proxy)
    hostname = (parsed.hostname or "").lower()
    if "dataimpulse" not in hostname:
        return candidates
    if "__" in parsed.username:
        return candidates

    attempts = int(os.environ.get("WB_COLLECTOR_PROXY_ATTEMPTS", "6"))
    base_session = f"{int(time.time())}{random.randint(1000, 9999)}"
    for offset in range(attempts):
        username = f"{parsed.username}__cr.ru;sessid.sellermap{base_session}{offset}"
        netloc = f"{username}:{parsed.password}@{parsed.hostname}"
        if parsed.port:
            netloc += f":{parsed.port}"
        candidates.append(urlunparse((parsed.scheme, netloc, parsed.path, parsed.params, parsed.query, parsed.fragment)))
    return candidates


async def main() -> int:
    if len(sys.argv) < 3:
        print(json.dumps({"ok": False, "error": "usage: wb_search_curl.py <query> <limit>"}), flush=True)
        return 2

    query = sys.argv[1]
    limit = int(sys.argv[2])
    proxy = os.environ.get("WB_COLLECTOR_PROXY_URL")
    encoded_query = quote(query)
    search_headers = {
        **HEADERS,
        "Referer": f"https://www.wildberries.ru/catalog/0/search.aspx?search={encoded_query}",
    }

    last_error: dict[str, Any] = {"ok": False, "error": "WB curl_cffi search did not run"}
    for attempt, candidate_proxy in enumerate(proxy_candidates(proxy), start=1):
        try:
            async with AsyncSession(impersonate="chrome124", timeout=8) as session:
                # Warm-up establishes normal public-site cookies before the JSON request.
                await session.get("https://www.wildberries.ru/", headers=HEADERS, proxy=candidate_proxy)
                await asyncio.sleep(0.8)
                response = await session.get(
                    WB_SEARCH_BASE,
                    params=build_params(query, limit),
                    headers=search_headers,
                    proxy=candidate_proxy,
                )
                content_type = response.headers.get("content-type", "")
                if response.status_code >= 400:
                    last_error = {
                        "ok": False,
                        "status": response.status_code,
                        "contentType": content_type,
                        "error": f"WB curl_cffi search returned {response.status_code}",
                        "attempt": attempt,
                        "bodyPreview": response.text[:240],
                    }
                    continue
                data = response.json()
                products = data.get("data", {}).get("products")
                if products is None:
                    products = data.get("products", [])
                print(json.dumps({
                    "ok": True,
                    "status": response.status_code,
                    "contentType": content_type,
                    "attempt": attempt,
                    "products": products,
                }, ensure_ascii=False), flush=True)
                return 0
        except Exception as exc:
            last_error = {"ok": False, "error": str(exc), "attempt": attempt}

    print(json.dumps(last_error, ensure_ascii=False), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
