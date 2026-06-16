import {
  pgTable, pgEnum, uuid, text, integer,
  boolean, timestamp, numeric,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["owner", "supervisor", "seamstress"]);
export const orderStatusEnum = pgEnum("order_status", ["open", "in_progress", "closed"]);
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
  requiresPasswordChange: boolean("requires_password_change").notNull().default(false),
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
  pricePerPiece: numeric("price_per_piece", { precision: 10, scale: 4 }),
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

export const payrollPeriods = pgTable("payroll_periods", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  startDate: text("start_date").notNull(), // DATE como text — evita bug Neon HTTP com Date bind params
  endDate: text("end_date").notNull(),
  status: text("status").notNull().default("open"), // "open" | "closed"
  createdAt: timestamp("created_at").notNull().defaultNow(),
  closedAt: timestamp("closed_at"),
});

export const advances = pgTable("advances", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  periodId: uuid("period_id").notNull().references(() => payrollPeriods.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Relations ───────────────────────────────────────────────────────────────

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  productionOrders: many(productionOrders),
  operations: many(operations),
  productionLogs: many(productionLogs),
  payrollPeriods: many(payrollPeriods),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  productionLogs: many(productionLogs),
  advances: many(advances),
}));

export const productionOrdersRelations = relations(productionOrders, ({ one, many }) => ({
  tenant: one(tenants, { fields: [productionOrders.tenantId], references: [tenants.id] }),
  productionLogs: many(productionLogs),
}));

export const operationsRelations = relations(operations, ({ one, many }) => ({
  tenant: one(tenants, { fields: [operations.tenantId], references: [tenants.id] }),
  productionLogs: many(productionLogs),
}));

export const productionLogsRelations = relations(productionLogs, ({ one }) => ({
  tenant: one(tenants, { fields: [productionLogs.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [productionLogs.userId], references: [users.id] }),
  productionOrder: one(productionOrders, { fields: [productionLogs.productionOrderId], references: [productionOrders.id] }),
  operation: one(operations, { fields: [productionLogs.operationId], references: [operations.id] }),
}));

export const payrollPeriodsRelations = relations(payrollPeriods, ({ one, many }) => ({
  tenant: one(tenants, { fields: [payrollPeriods.tenantId], references: [tenants.id] }),
  advances: many(advances),
}));

export const advancesRelations = relations(advances, ({ one }) => ({
  tenant: one(tenants, { fields: [advances.tenantId], references: [tenants.id] }),
  period: one(payrollPeriods, { fields: [advances.periodId], references: [payrollPeriods.id] }),
  user: one(users, { fields: [advances.userId], references: [users.id] }),
}));
