import fs from "node:fs";
import path from "node:path";
import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";

import { demoSources } from "./mock-source-data.js";

const DATA_DIR = path.resolve(process.cwd(), "data");
const DEFAULT_DB_PATH = path.join(DATA_DIR, "monitoring.sqlite");

let sqlPromise: Promise<SqlJsStatic> | null = null;
let databasePromise: Promise<Database> | null = null;

function getSql() {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({
      locateFile: (file) => path.resolve(process.cwd(), "node_modules", "sql.js", "dist", file),
    });
  }

  return sqlPromise;
}

function getDatabasePath() {
  return process.env.VACANCY_MONITOR_DB_PATH
    ? path.resolve(process.env.VACANCY_MONITOR_DB_PATH)
    : DEFAULT_DB_PATH;
}

function createSchema(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      baseUrl TEXT NOT NULL,
      specialty TEXT NOT NULL,
      region TEXT NOT NULL,
      status TEXT NOT NULL,
      lastCheckedAt TEXT,
      successRate INTEGER NOT NULL,
      responseTimeMs INTEGER NOT NULL,
      isDemo INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS monitoring_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      specialty TEXT NOT NULL,
      keywords TEXT NOT NULL,
      exclusions TEXT NOT NULL,
      regions TEXT NOT NULL,
      scheduleCron TEXT NOT NULL,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vacancies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      externalId TEXT NOT NULL,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT NOT NULL,
      specialty TEXT NOT NULL,
      salaryText TEXT,
      salaryMin INTEGER,
      salaryMax INTEGER,
      employmentType TEXT,
      sourceId INTEGER NOT NULL,
      sourceName TEXT NOT NULL,
      sourceUrl TEXT NOT NULL,
      summary TEXT NOT NULL,
      description TEXT NOT NULL,
      publishedAt TEXT,
      firstSeenAt TEXT NOT NULL,
      lastSeenAt TEXT NOT NULL,
      status TEXT NOT NULL,
      matchedRuleIds TEXT NOT NULL,
      FOREIGN KEY (sourceId) REFERENCES sources(id),
      UNIQUE(sourceId, externalId)
    );

    CREATE TABLE IF NOT EXISTS vacancy_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vacancyId INTEGER NOT NULL,
      changedAt TEXT NOT NULL,
      fieldName TEXT NOT NULL,
      oldValue TEXT,
      newValue TEXT,
      FOREIGN KEY (vacancyId) REFERENCES vacancies(id)
    );

    CREATE TABLE IF NOT EXISTS system_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      actor TEXT NOT NULL
    );
  `);
}

function saveDatabaseToFile(db: Database) {
  const dbPath = getDatabasePath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

function insertSeedData(db: Database) {
  const count = getScalarNumber(db, "SELECT COUNT(*) AS value FROM sources");
  if (count > 0) {
    return;
  }

  const now = new Date().toISOString();

  demoSources.forEach((source, index) => {
    runStatement(
      db,
      `INSERT INTO sources (name, baseUrl, specialty, region, status, lastCheckedAt, successRate, responseTimeMs, isDemo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        source.name,
        source.baseUrl,
        source.specialty,
        source.region,
        "active",
        null,
        source.successRate,
        source.responseTimeMs,
      ],
    );

    runStatement(
      db,
      `INSERT INTO monitoring_rules (name, specialty, keywords, exclusions, regions, scheduleCron, isActive, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        `Базовый мониторинг #${index + 1}`,
        source.specialty,
        JSON.stringify(source.specialty.includes("Frontend") ? ["typescript", "интерфейс", "web"] : ["аналитика", "sql", "мониторинг"]),
        JSON.stringify(["стажировка"]),
        JSON.stringify([source.region]),
        "0 */6 * * *",
        now,
      ],
    );
  });

  runStatement(
    db,
    "INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    ["monitorRunCount", "0"],
  );

  runStatement(
    db,
    `INSERT INTO system_logs (level, title, description, createdAt, actor)
     VALUES (?, ?, ?, ?, ?)`,
    ["info", "Система инициализирована", "Подготовлены источники и базовые правила мониторинга.", now, "system"],
  );

  saveDatabaseToFile(db);
}

async function createDatabase() {
  const SQL = await getSql();
  const dbPath = getDatabasePath();
  const buffer = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : undefined;
  let db: Database;

  try {
    db = buffer ? new SQL.Database(new Uint8Array(buffer)) : new SQL.Database();
  } catch {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }

    db = new SQL.Database();
  }

  createSchema(db);
  insertSeedData(db);

  return db;
}

export async function getDatabase() {
  if (!databasePromise) {
    databasePromise = createDatabase();
  }

  return databasePromise;
}

export async function persistDatabase() {
  const db = await getDatabase();
  saveDatabaseToFile(db);
}

export function queryRows<T>(db: Database, sql: string, params: Array<string | number | null> = []) {
  const statement = db.prepare(sql, params);
  const rows: T[] = [];

  while (statement.step()) {
    rows.push(statement.getAsObject() as T);
  }

  statement.free();
  return rows;
}

export function runStatement(db: Database, sql: string, params: Array<string | number | null> = []) {
  db.run(sql, params);
}

export function getScalarNumber(db: Database, sql: string, params: Array<string | number | null> = []) {
  const rows = queryRows<{ value: number }>(db, sql, params);
  return Number(rows[0]?.value ?? 0);
}

export function getScalarString(db: Database, sql: string, params: Array<string | number | null> = []) {
  const rows = queryRows<{ value: string }>(db, sql, params);
  return rows[0]?.value ?? "";
}

export async function resetDatabaseForTests() {
  const dbPath = getDatabasePath();

  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  databasePromise = null;
  const db = await getDatabase();
  saveDatabaseToFile(db);
}
