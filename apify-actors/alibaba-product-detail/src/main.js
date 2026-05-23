import { Actor } from "apify";
import { PlaywrightCrawler } from "crawlee";

await Actor.init();

const input = await Actor.getInput();
const startUrls = input?.startUrls ?? input?.productUrls ?? [];
const urls = startUrls.map((item) => typeof item === "string" ? item : item.url).filter(Boolean);

function valueAfterLabel(text, labels) {
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i += 1) {
    const current = lines[i].toLowerCase();
    if (!labels.some((label) => current.includes(label.toLowerCase()))) continue;
    const next = lines.slice(i + 1, i + 6).find((line) => /\d/.test(line));
    if (next) return next;
  }
  return null;
}

function parseDimensions(value) {
  if (!value) return null;
  const raw = value.toLowerCase().replace(/,/g, ".");
  const unit = raw.includes("mm") ? "mm" : raw.includes("m") && !raw.includes("cm") ? "m" : "cm";
  const nums = raw.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (nums.length < 2) return null;
  const factor = unit === "mm" ? 0.1 : unit === "m" ? 100 : 1;
  return {
    lengthCm: Number((nums[0] * factor).toFixed(1)),
    widthCm: Number((nums[1] * factor).toFixed(1)),
    heightCm: Number(((nums[2] ?? nums[1]) * factor).toFixed(1)),
  };
}

function parseWeight(value) {
  if (!value) return null;
  const raw = value.toLowerCase().replace(/,/g, ".");
  const number = Number(raw.match(/\d+(?:\.\d+)?/)?.[0]);
  if (!Number.isFinite(number)) return null;
  return raw.includes(" g") || raw.endsWith("g") ? number / 1000 : number;
}

const crawler = new PlaywrightCrawler({
  proxyConfiguration: await Actor.createProxyConfiguration(input?.proxyConfiguration ?? { useApifyProxy: true }),
  maxRequestsPerCrawl: urls.length || 1,
  async requestHandler({ page, request }) {
    await page.goto(request.url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(5000);
    const text = await page.locator("body").innerText().catch(() => "");
    const title = await page.title().catch(() => "");
    const packageText = valueAfterLabel(text, [
      "Single package size",
      "Package size",
      "Package dimensions",
      "产品包装尺寸",
    ]);
    const grossWeightText = valueAfterLabel(text, [
      "Single gross weight",
      "Gross weight",
      "毛重",
    ]);
    await Actor.pushData({
      url: request.url,
      title,
      packageSize: parseDimensions(packageText),
      grossWeightKg: parseWeight(grossWeightText),
      rawPackagingText: {
        packageSize: packageText,
        grossWeight: grossWeightText,
      },
      renderedText: text.slice(0, 20000),
    });
  },
});

await crawler.run(urls);
await Actor.exit();
