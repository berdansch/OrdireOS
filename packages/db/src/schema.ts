import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", [
  "owner",
  "supervisor",
  "seamstress",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "open",
  "in_progress",
  "closed",
]);

export const shiftEnum = pgEnum("shift", ["morning", "afternoon", "night"]);

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const productionOrders = pgTable("production_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  reference: text("reference").notNull(),
  clientName: text("client_name"),
  productDescription: text("product_description"),
  totalPieces: integer("total_pieces").notNull(),
  status: orderStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  closedAt: timestamp("closed_at"),
});

export const operations = pgTable("operations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  standardTimeSeconds: integer("standard_time_seconds"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const productionLogs = pgTable("production_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),
  productionOrderId: uuid("production_order_id").notNull().references(() => productionOrders.id),
  operationId: uuid("operation_id").notNull().references(() => operations.id),
  quantity: integer("quantity").notNull(),
  reworkQuantity: integer("rework_quantity").notNull().default(0),
  shift: shiftEnum("shift"),
  loggedAt: timestamp("logged_at").notNull().defaultNow(),
});
