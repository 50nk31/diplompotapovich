import path from "node:path";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../api/app.js";
import { resetDatabaseForTests } from "../api/db.js";

process.env.NODE_ENV = "test";
process.env.VACANCY_MONITOR_DB_PATH = path.resolve(process.cwd(), "data", "test-monitoring.sqlite");

describe("vacancy monitoring api", () => {
  beforeEach(async () => {
    await resetDatabaseForTests();
  });

  it("returns dashboard payload with metrics and logs", async () => {
    const app = createApp();
    const response = await request(app).get("/api/dashboard");

    expect(response.status).toBe(200);
    expect(response.body.metrics).toHaveLength(4);
    expect(response.body.recentVacancies.length).toBeGreaterThan(0);
    expect(response.body.recentLogs.length).toBeGreaterThan(0);
  });

  it("creates a rule and exposes it in the list", async () => {
    const app = createApp();
    const createResponse = await request(app).post("/api/rules").send({
      name: "Региональный мониторинг",
      specialty: "Backend-разработка",
      keywords: ["node", "api"],
      exclusions: ["intern"],
      regions: ["Новосибирск"],
      scheduleCron: "0 */8 * * *",
      isActive: true,
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.some((item: { name: string }) => item.name === "Региональный мониторинг")).toBe(true);
  });

  it("runs monitoring and returns execution summary", async () => {
    const app = createApp();
    const response = await request(app).post("/api/monitoring/run");

    expect(response.status).toBe(200);
    expect(response.body.runNumber).toBeGreaterThan(0);
    expect(response.body.totalVacancies).toBeGreaterThan(0);
  });

  it("creates a collection and adds a vacancy to it", async () => {
    const app = createApp();

    const createCollectionResponse = await request(app).post("/api/collections").send({
      name: "Приоритетные вакансии",
      description: "Выборка для быстрого просмотра изменений",
      filters: {
        search: "",
        specialty: "Frontend-разработка",
        location: "",
        status: "new",
      },
    });

    expect(createCollectionResponse.status).toBe(201);
    expect(createCollectionResponse.body.some((item: { name: string }) => item.name === "Приоритетные вакансии")).toBe(true);

    const vacanciesResponse = await request(app).get("/api/vacancies");
    const vacancyId = vacanciesResponse.body.items[0]?.id;
    const collectionId = createCollectionResponse.body.find((item: { name: string; id: number }) => item.name === "Приоритетные вакансии")?.id;

    const addItemResponse = await request(app).post(`/api/collections/${collectionId}/items`).send({
      vacancyId,
      note: "Проверить после следующего запуска",
    });

    expect(addItemResponse.status).toBe(200);
    expect(addItemResponse.body.items).toHaveLength(1);
    expect(addItemResponse.body.items[0].vacancy.id).toBe(vacancyId);
  });
});
