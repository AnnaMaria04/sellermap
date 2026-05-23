import express, { type NextFunction, type Request, type Response } from "express";
import { config } from "./config.js";
import { batchRouter } from "./routes/batch.js";
import { healthRouter } from "./routes/health.js";
import { productRouter } from "./routes/product.js";
import { searchRouter } from "./routes/search.js";
import { logger } from "./utils/logger.js";
import { errorMessage } from "./utils/errors.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use(healthRouter);
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!config.apiKey) {
      res.status(503).json({ status: "failed", error: "WORKER_API_KEY is not configured." });
      return;
    }
    const header = req.header("authorization") ?? "";
    if (header !== `Bearer ${config.apiKey}`) {
      res.status(401).json({ status: "failed", error: "Unauthorized" });
      return;
    }
    next();
  });
  app.use(searchRouter);
  app.use(productRouter);
  app.use(batchRouter);
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ error: errorMessage(error) }, "REQUEST_FAILED");
    res.status(500).json({ status: "failed", error: errorMessage(error) });
  });
  return app;
}

if (process.env.NODE_ENV !== "test") {
  createApp().listen(config.port, () => {
    logger.info({ port: config.port }, "sellermap-own-wb-collector started");
  });
}
