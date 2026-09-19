import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const reports = mysqlTable("reports", {
  id: varchar("id", { length: 32 }).primaryKey(),
  description: text("description").notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  imageUrl: text("imageUrl"),
  audioUrl: text("audioUrl"),
  source: mysqlEnum("source", ["Photo", "Text", "Voice"]).default("Text").notNull(),
  category: varchar("category", { length: 120 }).notNull(),
  shortCategory: varchar("shortCategory", { length: 60 }).notNull(),
  priority: mysqlEnum("priority", ["High", "Medium", "Low"]).notNull(),
  confidence: int("confidence").notNull(),
  evidence: text("evidence").notNull(),
  summary: text("summary").notNull(),
  department: varchar("department", { length: 160 }).notNull(),
  suggestedAction: text("suggestedAction").notNull(),
  status: mysqlEnum("status", ["New", "Assigned", "In progress", "Resolved"]).default("New").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const issueClusters = mysqlTable("issueClusters", {
  id: varchar("id", { length: 32 }).primaryKey(),
  category: varchar("category", { length: 120 }).notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  reportCount: int("reportCount").notNull(),
  priority: mysqlEnum("priority", ["High", "Medium", "Low"]).notNull(),
  summary: text("summary").notNull(),
  recommendedAction: text("recommendedAction").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;
export type IssueCluster = typeof issueClusters.$inferSelect;
export type InsertIssueCluster = typeof issueClusters.$inferInsert;
