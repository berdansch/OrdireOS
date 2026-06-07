import { Hono } from "hono";
import { eq, and, sql } from "drizzle-orm";
import { createDb, productionLogs, operations, productionOrders, users } from "@ordireos/db";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import type { AppContext } from "../index";

export const dashboardRoutes = new Hono<AppContext>();

dashboardRoutes.get("/", authMiddleware, requireRole(["owner", "supervisor"]), async (c) => {
  const { tenant_id } = c.get("auth");
  const startStr = c.req.query("start");
  const endStr = c.req.query("end");

  if (!startStr || !endStr) {
    return c.json({ error: "Parametros start e end sao obrigatorios" }, 400);
  }

  // Neon HTTP driver nao aceita Date objects como bind params — usar sql.raw com ISO strings validadas
  const safeStart = new Date(startStr).toISOString();
  const safeEnd = new Date(endStr).toISOString();

  const db = createDb(c.env.DATABASE_URL);

  const logs = await db
    .select({
      id: productionLogs.id,
      quantity: productionLogs.quantity,
      reworkQuantity: productionLogs.reworkQuantity,
      shift: productionLogs.shift,
      loggedAt: productionLogs.loggedAt,
      userId: productionLogs.userId,
      operationId: productionLogs.operationId,
      productionOrderId: productionLogs.productionOrderId,
      operationName: operations.name,
      pricePerPiece: operations.pricePerPiece,
      userName: users.name,
      orderReference: productionOrders.reference,
      clientName: productionOrders.clientName,
      totalPieces: productionOrders.totalPieces,
    })
    .from(productionLogs)
    .innerJoin(operations, eq(productionLogs.operationId, operations.id))
    .innerJoin(users, eq(productionLogs.userId, users.id))
    .innerJoin(productionOrders, eq(productionLogs.productionOrderId, productionOrders.id))
    .where(and(
      eq(productionLogs.tenantId, tenant_id),
      sql`${productionLogs.loggedAt} >= ${sql.raw("'" + safeStart + "'")}::timestamptz`,
      sql`${productionLogs.loggedAt} <= ${sql.raw("'" + safeEnd + "'")}::timestamptz`,
    ));

  const totalPieces = logs.reduce((acc, l) => acc + l.quantity, 0);
  const totalRework = logs.reduce((acc, l) => acc + l.reworkQuantity, 0);
  const reworkRate = totalPieces > 0 ? (totalRework / totalPieces) * 100 : 0;

  const byShift = { morning: 0, afternoon: 0, night: 0 };
  for (const log of logs) {
    if (log.shift === "morning") byShift.morning += log.quantity;
    else if (log.shift === "afternoon") byShift.afternoon += log.quantity;
    else if (log.shift === "night") byShift.night += log.quantity;
  }

  const operationMap = new Map<string, {
    operationId: string;
    operationName: string;
    quantity: number;
    reworkQuantity: number;
    pricePerPiece: string | null;
    totalCost: number;
  }>();

  for (const log of logs) {
    const existing = operationMap.get(log.operationId) ?? {
      operationId: log.operationId,
      operationName: log.operationName,
      quantity: 0,
      reworkQuantity: 0,
      pricePerPiece: log.pricePerPiece,
      totalCost: 0,
    };
    existing.quantity += log.quantity;
    existing.reworkQuantity += log.reworkQuantity;
    if (log.pricePerPiece) {
      existing.totalCost += log.quantity * parseFloat(log.pricePerPiece);
    }
    operationMap.set(log.operationId, existing);
  }

  const byOperation = Array.from(operationMap.values()).sort((a, b) => b.quantity - a.quantity);

  const seamstressMap = new Map<string, {
    userId: string;
    userName: string;
    quantity: number;
    reworkQuantity: number;
  }>();

  for (const log of logs) {
    const existing = seamstressMap.get(log.userId) ?? {
      userId: log.userId,
      userName: log.userName,
      quantity: 0,
      reworkQuantity: 0,
    };
    existing.quantity += log.quantity;
    existing.reworkQuantity += log.reworkQuantity;
    seamstressMap.set(log.userId, existing);
  }

  const bySeamstress = Array.from(seamstressMap.values()).sort((a, b) => b.quantity - a.quantity);

  const openOrdersList = await db
    .select()
    .from(productionOrders)
    .where(and(
      eq(productionOrders.tenantId, tenant_id),
      sql`${productionOrders.status} = 'in_progress'`
    ));

  const openOrders = await Promise.all(
    openOrdersList.map(async (order) => {
      const orderLogs = await db
        .select({ quantity: productionLogs.quantity })
        .from(productionLogs)
        .where(and(
          eq(productionLogs.productionOrderId, order.id),
          eq(productionLogs.tenantId, tenant_id)
        ));

      const producedPieces = orderLogs.reduce((acc, l) => acc + l.quantity, 0);
      const completionRate = order.totalPieces > 0
        ? (producedPieces / order.totalPieces) * 100
        : 0;

      return {
        orderId: order.id,
        reference: order.reference,
        clientName: order.clientName,
        totalPieces: order.totalPieces,
        producedPieces,
        completionRate: Math.min(completionRate, 100),
      };
    })
  );

  return c.json({ totalPieces, totalRework, reworkRate, byShift, byOperation, bySeamstress, openOrders });
});
