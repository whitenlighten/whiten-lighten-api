import { PrismaService } from "prisma/prisma.service";

export class AuditLogger {
  constructor(private prisma: PrismaService) {}

  async log({
    action,
    model,
    recordId,
    oldData,
    newData,
    createdBy,
  }: {
    action: string;
    model: string;
    recordId: string;
    oldData?: any;
    newData?: any;
    createdBy?: string;
  }) {
    await this.prisma.auditTrail.create({
      data: {
        action,
        model,
        recordId,
        oldData: oldData || null,
        newData: newData || null,
        createdBy: createdBy || null,
      },
    });
  }
}
