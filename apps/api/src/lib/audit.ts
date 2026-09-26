import type { Prisma } from "../generated/prisma/client.ts";
import { prisma } from "../db.ts";

type Db = Pick<typeof prisma, "adminAuditLog"> | Prisma.TransactionClient;

export async function audit(
  db: Db,
  actorId: string,
  action: string,
  entity: string,
  entityId: string,
  data?: Prisma.InputJsonValue,
) {
  await db.adminAuditLog.create({ data: { actorId, action, entity, entityId, ...(data === undefined ? {} : { data }) } });
}
