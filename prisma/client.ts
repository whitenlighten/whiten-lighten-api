import { PrismaClient } from "@prisma/client";

// Named export
export const prisma = new PrismaClient();

// Extend Prisma client to log all operations
prisma.$extends({
  client: {
    $allOperations: {
      needs: {}, // No specific needs
      async compute({ params, result, query }) {
        console.log(`Prisma Operation: ${params.model}.${params.action}`);
        return result; // Return the original result
      },
    },
  },
});
