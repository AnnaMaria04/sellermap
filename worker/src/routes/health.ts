import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "sellermap-own-wb-collector",
    version: "1.0.0",
    time: new Date().toISOString(),
  });
});
