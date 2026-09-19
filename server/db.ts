import { count, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertReport, InsertUser, reports, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];

  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };

  textFields.forEach(assignNullable);

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createReport(report: InsertReport) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  await db.insert(reports).values(report);
  const result = await db.select().from(reports).where(eq(reports.id, report.id)).limit(1);
  return result[0];
}

export async function getReports(limit = 100) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  return db.select().from(reports).orderBy(desc(reports.createdAt)).limit(limit);
}

export async function getReportById(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const result = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
  return result[0];
}

export async function getDashboardMetrics() {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");

  const [total, highPriority, open, resolved, categoryRows, hotspotRows] = await Promise.all([
    db.select({ value: count() }).from(reports),
    db.select({ value: count() }).from(reports).where(eq(reports.priority, "High")),
    db.select({ value: count() }).from(reports).where(sql`${reports.status} <> 'Resolved'`),
    db.select({ value: count() }).from(reports).where(eq(reports.status, "Resolved")),
    db.select({ category: reports.shortCategory, value: count() }).from(reports).groupBy(reports.shortCategory),
    db.select({ category: reports.shortCategory, location: reports.location, value: count() }).from(reports).groupBy(reports.shortCategory, reports.location).orderBy(desc(count())).limit(1),
  ]);

  return {
    total: total[0]?.value ?? 0,
    highPriority: highPriority[0]?.value ?? 0,
    open: open[0]?.value ?? 0,
    resolved: resolved[0]?.value ?? 0,
    categoryDistribution: categoryRows.map(row => ({ label: row.category, value: Number(row.value) })),
    hotspot: hotspotRows[0] ? {
      category: hotspotRows[0].category,
      location: hotspotRows[0].location,
      reportCount: Number(hotspotRows[0].value),
    } : null,
  };
}
