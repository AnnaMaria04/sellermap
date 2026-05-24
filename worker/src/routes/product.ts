import { Router } from "express";
import { z } from "zod";
import { collectWbProduct } from "../collectors/wb-product-collector.js";
import { runSerialized } from "../utils/rate-limit.js";

export const productRouter = Router();

const productSchema = z.object({
  nmId: z.string().trim().regex(/^\d{5,14}$/),
});

productRouter.post("/product", async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: "failed", source: "own-wb", nmId: "", product: null, warnings: ["VALIDATION_FAILED"], issues: parsed.error.issues });
    return;
  }
  const result = await runSerialized(() => collectWbProduct(parsed.data.nmId));
  res.status(200).json(result);
});
