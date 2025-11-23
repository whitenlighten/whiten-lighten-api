// src/pharmacy/pharmacy.service.ts

import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { AuditTrailService } from 'src/audit-trail/auditTrail.service';

@Injectable()
export class PharmacyService {
  constructor(
    private prisma: PrismaService,
    private auditTrailService: AuditTrailService, // ⬅️ INJECTED
  ) {}

  // --------------------------------------------------
  // CREATE ITEM
  // --------------------------------------------------
  async createItem(dto: any, user: any) {
    try {
      const newItem = await this.prisma.pharmacyItem.create({ data: dto });

      // 🛡️ AUDIT LOG
      await this.auditTrailService.log({
    action: 'PHARMACY_ITEM_CREATED', // Or your specific action name
    entityType: 'PharmacyItem',
    entityId: newItem.id,
    actorId: user,
    actorRole: user.role,
    details: { sku: newItem.sku, name: newItem.name }
});
      
      return newItem;
    } catch (error) {
      throw new InternalServerErrorException('Failed to create item.');
    }
  }

  // --------------------------------------------------
  // LIST + PAGINATION + OPTIONAL LOW-STOCK (No Audit required)
  // --------------------------------------------------
  async listItems(query: { page?: number; limit?: number; lowStock?: number }) {
    const page = Math.max(query.page || 1, 1);
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;
    
    const where: any = {}; 
    if (typeof query.lowStock === 'number') {
      where.stock = { lte: query.lowStock };
    }

    try {
      const [total, data] = await this.prisma.$transaction([
        this.prisma.pharmacyItem.count({ where }),
        this.prisma.pharmacyItem.findMany({ 
          where, 
          skip, 
          take: limit, 
          orderBy: { name: 'asc' } 
        }),
      ]);
      return { meta: { total, page, limit, pages: Math.ceil(total / limit) }, data };
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch items list.');
    }
  }

  // --------------------------------------------------
  // UPDATE ITEM
  // --------------------------------------------------
  async updateItem(id: string, dto: any, user: any) { // ⬅️ ADDED USER
    try {
      // Fetch the old record state before update for detailed logging (optional but good practice)
      const oldItem = await this.prisma.pharmacyItem.findUnique({ where: { id } });
      if (!oldItem) {
          throw new NotFoundException(`Pharmacy Item with ID "${id}" not found.`);
      }

      const updatedItem = await this.prisma.pharmacyItem.update({ where: { id }, data: dto });

      // 🛡️ AUDIT LOG: SUCCESSFUL ITEM UPDATE
     await this.auditTrailService.log({
    action: 'PHARMACY_ITEM_UPDATED', // Or your specific action name
    entityType: 'PharmacyItem',
    entityId: id,
    actorId: user,
    actorRole: user.role,
    details: { changes: dto }
});


      return updatedItem;
    } catch (error) {
       if (error instanceof NotFoundException) throw error;
       // Prisma P2025 will be caught by the block above if oldItem is checked first.
       throw new InternalServerErrorException('Failed to update item.');
    }
  }

  // --------------------------------------------------
  // DELETE ITEM
  // --------------------------------------------------
  async deleteItem(id: string, user: any) { // ⬅️ ADDED USER
    try {
      const deletedItem = await this.prisma.pharmacyItem.delete({ where: { id } });

      // 🛡️ AUDIT LOG: SUCCESSFUL ITEM DELETION
      await this.auditTrailService.log({
    action: 'PHARMACY_ITEM_DELETED', // Or your specific action name
    entityType: 'PharmacyItem',
    entityId: id,
    actorId: user,
    actorRole: user.role,
    details: { name: deletedItem.name, sku: deletedItem.sku }
});

      
      return deletedItem;
    } catch (error) {
      // Check for Prisma error P2025 (Record not found)
      // Note: The specific error handling may depend on your Prisma setup
      throw new NotFoundException(`Pharmacy Item with ID "${id}" not found for deletion.`);
    }
  }

  // --------------------------------------------------
  // REGISTER A SALE (TRANSACTIONAL)
  // --------------------------------------------------
  async createSale(itemId: string, qty: number, user: any) { // ⬅️ NOW PASSING FULL USER
    if (qty <= 0) throw new BadRequestException('Quantity must be greater than zero.');
    
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.pharmacyItem.findUnique({ where: { id: itemId } });
      
      // 1. Validation Checks
      if (!item) throw new NotFoundException('Item not found');
      if (item.stock < qty) throw new BadRequestException(`Insufficient stock. Available: ${item.stock}`);

      // 2. Create Sale Record
      const totalAmount = qty * item.unitPrice;
      const sale = await tx.pharmacySale.create({
        data: { itemId, quantity: qty, totalAmount, createdById: user?.id },
      });

      // 3. Update Stock
      await tx.pharmacyItem.update({ 
        where: { id: itemId }, 
        data: { stock: item.stock - qty } 
      });

      // 🛡️ AUDIT LOG: SUCCESSFUL SALE REGISTRATION
      await this.auditTrailService.log({
    action: 'PHARMACY_SALE_CREATED', // Or your specific action name
    entityType: 'PharmacySale',
    entityId: sale.id,
    actorId: user,
    actorRole: user.role,
    details: { /* The object with itemId, quantity, etc. */ }
});

      return sale;
    });
  }

  // --------------------------------------------------
  // SALES REPORT (AGGREGATE) (No Audit required)
  // --------------------------------------------------
  async salesReport(from?: Date, to?: Date) {
    const fromDate = from ?? new Date(0);
    const toDate = to ?? new Date();
    
    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        T1."itemId", 
        T2.name as item_name,
        SUM(T1.quantity) as total_qty, 
        SUM("totalAmount") as revenue
      FROM "PharmacySale" T1
      JOIN "PharmacyItem" T2 ON T1."itemId" = T2.id
      WHERE T1."createdAt" >= $1 AND T1."createdAt" <= $2
      GROUP BY T1."itemId", T2.name
      ORDER BY revenue DESC
    `, fromDate, toDate);
    
    return rows.map(row => ({
        itemId: row.itemId,
        itemName: row.item_name,
        totalQuantity: Number(row.total_qty),
        totalRevenue: Number(row.revenue),
    }));
  }
}