import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { collectWbSearch } from "../collectors/wb-search-collector.js";
import { runSerialized } from "../utils/rate-limit.js";

export const batchRouter = Router();

const batchSchema = z.object({
  queries: z.array(z.string().trim().min(2)).min(1).max(10),
  limitPerQuery: z.number().int().positive().max(config.maxResults).optional().default(20),
});

batchRouter.post("/batch", async (req, res) => {
  const parsed = batchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: "failed", source: "own-wb", results: [], warnings: ["VALIDATION_FAILED"], issues: parsed.error.issues });
    return;
  }
  const results = [];
  for (const query of parsed.data.queries) {
    results.push(await runSerialized(() => collectWbSearch(query, parsed.data.limitPerQuery)));
  }
  const hasSuccess = results.some((item) => item.status === "success" || item.status === "partial");
  res.status(hasSuccess ? 200 : 502).json({
    status: hasSuccess ? "partial" : "failed",
    source: "own-wb",
    results,
    warnings: results.flatMap((item) => item.warnings),
  });
});
