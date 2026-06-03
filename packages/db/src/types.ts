// packages/db/src/types.ts
// Tipos inferidos diretamente do schema Drizzle — fonte de verdade unica
// Importe estes tipos no frontend em vez de declarar manualmente

import type {
  tenants,
  users,
  productionOrders,
  operations,
  productionLogs,
} from "./schema";

// Tipos de leitura (SELECT)
export type Tenant = typeof tenants.$inferSelect;
export type User = typeof users.$inferSelect;
export type ProductionOrder = typeof productionOrders.$inferSelect;
export type Operation = typeof operations.$inferSelect;
export type ProductionLog = typeof productionLogs.$inferSelect;

// Tipos de escrita (INSERT)
export type NewTenant = typeof tenants.$inferInsert;
export type NewUser = typeof users.$inferInsert;
export type NewProductionOrder = typeof productionOrders.$inferInsert;
export type NewOperation = typeof operations.$inferInsert;
export type NewProductionLog = typeof productionLogs.$inferInsert;

// Tipos compostos para respostas da API
export type ProductionLogWithRelations = Pick<
  ProductionLog,
  "id" | "quantity" | "reworkQuantity" | "shift" | "loggedAt"
> & {
  operationName: string;
  orderReference: string;
};

export type DailyHistory = {
  logs: ProductionLogWithRelations[];
  total: number;
};

export type SeamstressUser = Pick<User, "id" | "name" | "role" | "tenantId">;
