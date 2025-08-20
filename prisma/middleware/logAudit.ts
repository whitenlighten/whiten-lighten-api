import { prisma } from "../client";
export type AuditAction = "CREATE" | "UPDATE" | "DELETE";

export async function logAudit(
  action: AuditAction,
  model: string,
  recordId: string,
  oldData: any = null,
  newData: any = null
) {
  await prisma.auditTrail.create({
    data: {
      action,
      model,
      recordId,
      oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : undefined,
      newData: newData ? JSON.parse(JSON.stringify(newData)) : undefined,

      createdAt: new Date(),
    },
  });
}
