import { prisma } from "../client";

prisma.$extends({
  client: {
    async $query(args, next) {
      // This will intercept all queries (reads)
      return next(args);
    },
    async $mutation(args, next) {
      // This intercepts all writes (create/update/delete)
      if (["create", "update", "delete"].includes(args.action)) {
        let oldRecord: any = null;

        if (args.action === "update" || args.action === "delete") {
          oldRecord = await (prisma as any)[args.model].findUnique({
            where: args.args.where,
          });
        }

        const newRecord = await next(args);

        await prisma.auditLog.create({
          data: {
            userId: null,
            action: args.action.toUpperCase(),
            resource: args.model,
            resourceId: newRecord?.id ?? args.args.where?.id ?? null,
            changes: {
              old: oldRecord,
              new: newRecord,
            },
          },
        });

        return newRecord;
      }

      return next(args);
    },
  },
});
