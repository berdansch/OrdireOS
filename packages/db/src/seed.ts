import { createDb } from "./index";
import { tenants, users, productionOrders, operations } from "./schema";
import bcrypt from "bcryptjs";

const DATABASE_URL = process.env.DATABASE_URL!;

async function seed() {
  const db = createDb(DATABASE_URL);

  console.log("🌱 Iniciando seed...");

  const [tenant] = await db.insert(tenants).values({
    name: "Confecções Silva",
    slug: "confeccoes-silva",
  }).returning();

  console.log(`✅ Tenant criado: ${tenant.name}`);

  const passwordHash = await bcrypt.hash("senha123", 10);

  const [owner] = await db.insert(users).values({
    tenantId: tenant.id,
    name: "João Silva",
    email: "joao@confeccoessilva.com.br",
    passwordHash,
    role: "owner",
  }).returning();

  const [supervisor] = await db.insert(users).values({
    tenantId: tenant.id,
    name: "Maria Supervisora",
    email: "maria@confeccoessilva.com.br",
    passwordHash,
    role: "supervisor",
  }).returning();

  const [seamstress] = await db.insert(users).values({
    tenantId: tenant.id,
    name: "Ana Costureira",
    email: "ana@confeccoessilva.com.br",
    passwordHash,
    role: "seamstress",
  }).returning();

  console.log(`✅ Usuários criados: ${owner.name}, ${supervisor.name}, ${seamstress.name}`);

  await db.insert(operations).values([
    { tenantId: tenant.id, name: "Costura de manga", standardTimeSeconds: 45 },
    { tenantId: tenant.id, name: "Costura de gola", standardTimeSeconds: 60 },
    { tenantId: tenant.id, name: "Remate", standardTimeSeconds: 30 },
    { tenantId: tenant.id, name: "Fechamento lateral", standardTimeSeconds: 50 },
    { tenantId: tenant.id, name: "Bainha", standardTimeSeconds: 40 },
  ]);

  console.log("✅ 5 operações criadas");

  await db.insert(productionOrders).values({
    tenantId: tenant.id,
    reference: "OS-2026-001",
    clientName: "Lojas Renner",
    productDescription: "Camiseta básica feminina P/M/G",
    totalPieces: 500,
    status: "in_progress",
  });

  console.log("✅ Ordem OS-2026-001 criada");
  console.log("\n🎉 Seed concluído!");
  console.log("Credenciais: email / senha123");
}

seed().catch((err) => {
  console.error("❌ Erro no seed:", err);
  process.exit(1);
});
