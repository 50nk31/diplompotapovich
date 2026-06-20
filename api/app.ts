import express from "express";
import cors from "cors";
import { z } from "zod";

import {
  addCollectionItem,
  createCollection,
  createRule,
  createSource,
  getAnalytics,
  getCollectionDetails,
  getCollections,
  getDashboardData,
  getLogs,
  getRules,
  getSources,
  getVacancies,
  getVacancyDetails,
  removeCollectionItem,
  runMonitoring,
  updateRule,
  updateSource,
} from "./services.js";

const querySchema = z.object({
  search: z.string().optional(),
  specialty: z.string().optional(),
  location: z.string().optional(),
  status: z.string().optional(),
});

const ruleSchema = z.object({
  name: z.string().min(3),
  specialty: z.string().min(2),
  keywords: z.array(z.string()).default([]),
  exclusions: z.array(z.string()).default([]),
  regions: z.array(z.string()).default([]),
  scheduleCron: z.string().min(5),
  isActive: z.boolean(),
});

const sourceSchema = z.object({
  name: z.string().min(2),
  baseUrl: z.string().url(),
  specialty: z.string().min(2),
  region: z.string().min(2),
  status: z.enum(["active", "paused", "error"]),
  successRate: z.number().min(0).max(100),
  responseTimeMs: z.number().min(50),
  isDemo: z.boolean(),
});

const collectionFiltersSchema = z.object({
  search: z.string().default(""),
  specialty: z.string().default(""),
  location: z.string().default(""),
  status: z.string().default(""),
});

const collectionSchema = z.object({
  name: z.string().min(3),
  description: z.string().min(6),
  filters: collectionFiltersSchema,
});

const collectionItemSchema = z.object({
  vacancyId: z.number().int().positive(),
  note: z.string().trim().max(240).nullable().optional(),
});

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/api/dashboard", async (_request, response) => {
    response.json(await getDashboardData());
  });

  app.get("/api/vacancies", async (request, response) => {
    response.json(await getVacancies(querySchema.parse(request.query)));
  });

  app.get("/api/vacancies/:id", async (request, response) => {
    const result = await getVacancyDetails(Number(request.params.id));

    if (!result) {
      response.status(404).json({ message: "Вакансия не найдена" });
      return;
    }

    response.json(result);
  });

  app.get("/api/rules", async (_request, response) => {
    response.json(await getRules());
  });

  app.post("/api/rules", async (request, response) => {
    response.status(201).json(await createRule(ruleSchema.parse(request.body)));
  });

  app.put("/api/rules/:id", async (request, response) => {
    response.json(await updateRule(Number(request.params.id), ruleSchema.parse(request.body)));
  });

  app.get("/api/sources", async (_request, response) => {
    response.json(await getSources());
  });

  app.post("/api/sources", async (request, response) => {
    response.status(201).json(await createSource(sourceSchema.parse(request.body)));
  });

  app.put("/api/sources/:id", async (request, response) => {
    response.json(await updateSource(Number(request.params.id), sourceSchema.parse(request.body)));
  });

  app.get("/api/collections", async (_request, response) => {
    response.json(await getCollections());
  });

  app.get("/api/collections/:id", async (request, response) => {
    const result = await getCollectionDetails(Number(request.params.id));

    if (!result) {
      response.status(404).json({ message: "Подборка не найдена" });
      return;
    }

    response.json(result);
  });

  app.post("/api/collections", async (request, response) => {
    response.status(201).json(await createCollection(collectionSchema.parse(request.body)));
  });

  app.post("/api/collections/:id/items", async (request, response) => {
    const payload = collectionItemSchema.parse(request.body);
    response.json(await addCollectionItem(Number(request.params.id), payload.vacancyId, payload.note ?? null));
  });

  app.delete("/api/collections/:id/items/:vacancyId", async (request, response) => {
    response.json(await removeCollectionItem(Number(request.params.id), Number(request.params.vacancyId)));
  });

  app.post("/api/monitoring/run", async (_request, response) => {
    response.json(await runMonitoring({ trigger: "manual", actor: "operator" }));
  });

  app.get("/api/analytics/summary", async (_request, response) => {
    response.json(await getAnalytics());
  });

  app.get("/api/logs", async (_request, response) => {
    response.json(await getLogs());
  });

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    if (error instanceof z.ZodError) {
      response.status(400).json({ message: "Некорректные данные", issues: error.issues });
      return;
    }

    const message = error instanceof Error ? error.message : "Внутренняя ошибка сервера";
    response.status(500).json({ message });
  });

  return app;
}
