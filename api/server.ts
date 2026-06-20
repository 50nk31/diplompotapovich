import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";

import { createApp } from "./app.js";
import { ensureMonitoringSeed } from "./services.js";

const PORT = Number(process.env.PORT ?? 4173);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, "..", "..", "dist");

async function startServer() {
  await ensureMonitoringSeed();

  const app = createApp();

  if (process.env.NODE_ENV === "production") {
    app.use(express.static(distPath));
    app.get("*", (_request, response) => {
      response.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
