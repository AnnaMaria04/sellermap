import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { collectWbSearch } from "../collectors/wb-search-collector.js";
import { runSerialized } from "../utils/rate-limit.js";

export const searchRouter = Router();

const searchSchema = z.object({
  query: z.string().trim().min(2),
  limit: z.number().int().positive().max(config.maxResults).optional().default(20),
});

searchRouter.post("/search", async (req, res) => {
  const parsed = searchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: "failed", source: "own-wb", query: "", items: [], warnings: ["VALIDATION_FAILED"], issues: parsed.error.issues });
    return;
  }
  const result = await runSerialized(() => collectWbSearch(parsed.data.query, parsed.data.limit));
  res.status(200).json(result);
});
