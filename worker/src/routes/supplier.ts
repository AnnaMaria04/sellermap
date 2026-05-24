import { Router } from "express";
import { z } from "zod";
import { collectSupplierProduct } from "../collectors/supplier-collector.js";

export const supplierRouter = Router();

const supplierSchema = z.object({
  url: z.string().url(),
});

supplierRouter.post("/supplier", async (req, res) => {
  const parsed = supplierSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      status: "failed",
      source: "own-supplier",
      platform: "unknown",
      url: "",
      product: null,
      warnings: ["VALIDATION_FAILED"],
      issues: parsed.error.issues,
    });
    return;
  }
  const result = await collectSupplierProduct(parsed.data.url);
  res.status(200).json(result);
});
