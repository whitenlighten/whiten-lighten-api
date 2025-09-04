import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import {
  CreateInvoiceDto,
  QueryInvoicesDto,
  AddPaymentDto,
  QueryPaymentsDto,
} from './billing.dto';
import { InvoiceStatus, PaymentMethod, Role } from '@prisma/client';
import { Injectable } from '@nestjs/common';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // -------------------------
  // RBAC Helpers
  // -------------------------
  private assertCanManageInvoices(user: any) {
    if (![Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE].includes(user.role)) {
      throw new ForbiddenException('You are not allowed to manage invoices');
    }
  }

  private assertCanViewInvoice(user: any, patientId: string) {
    if (user.role === Role.PATIENT && user.id !== patientId) {
      throw new ForbiddenException('You may only view your own invoices.');
    }
  }

  // -------------------------
  // Invoices
  // -------------------------
  async createInvoice(dto: CreateInvoiceDto, user: any) {
    this.assertCanManageInvoices(user);

    try {
      const patient = await this.prisma.patient.findUnique({ where: { id: dto.patientId } });
      if (!patient) throw new NotFoundException('Patient not found');

      const invoice = await this.prisma.invoice.create({
        data: {
          patientId: dto.patientId,
          amount: dto.amount,
          currency: dto.currency ?? 'NGN',
          description: dto.description,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          reference: dto.reference,
          status: InvoiceStatus.UNPAID,
        },
      });

      this.logger.log(`Invoice created: ${invoice.id} by ${user.id}`);
      return invoice;
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new BadRequestException('Invoice reference already exists');
      }
      throw err instanceof NotFoundException ? err : new InternalServerErrorException('Failed to create invoice');
    }
  }

  async listInvoices(query: QueryInvoicesDto, user: any) {
    this.assertCanManageInvoices(user);

    const page = Math.max(parseInt(query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(query.limit || '20', 10), 1), 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.q) {
      where.OR = [
        { reference: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
        { patient: { firstName: { contains: query.q, mode: 'insensitive' } } },
        { patient: { lastName: { contains: query.q, mode: 'insensitive' } } },
        { patient: { email: { contains: query.q, mode: 'insensitive' } } },
      ];
    }
    if (query.status) where.status = query.status;

    try {
      const [total, data] = await this.prisma.$transaction([
        this.prisma.invoice.count({ where }),
        this.prisma.invoice.findMany({
          where,
          skip,
          take: limit,
          orderBy: { issuedAt: 'desc' },
          include: { patient: { select: { id: true, firstName: true, lastName: true, email: true } } },
        }),
      ]);

      return { meta: { total, page, limit, pages: Math.ceil(total / limit) }, data };
    } catch (err) {
      this.logger.error('Failed to list invoices', err);
      throw new InternalServerErrorException('Failed to fetch invoices');
    }
  }

  async getInvoice(id: string, user: any) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
        payments: true,
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    this.assertCanViewInvoice(user, invoice.patientId);
    return invoice;
  }

  // -------------------------
  // Payments
  // -------------------------
async addPayment(invoiceId: string, dto: AddPaymentDto, user: any) {
  this.assertCanManageInvoices(user);


  // : Check if invoice exists
  const invoice = await this.prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });

  if (!invoice) {
    throw new NotFoundException(`Invoice with ID ${invoiceId} not found`);
  }
  // : Validate incoming payment details
  if (dto.amount <= 0) {
    throw new BadRequestException('Amount must be positive');
  }
  if (!(Object.values(PaymentMethod) as string[]).includes(dto.method)) {
    throw new BadRequestException('Invalid payment method');
  }


  // ✅ Step 3: Calculate payments already made
  const alreadyPaid = invoice.payments
    .filter(p => p.status === 'SUCCESS')
    .reduce((sum, p) => sum + p.amount, 0);

  const newTotal = alreadyPaid + dto.amount;

  try {
    // ✅ Step 4: Create new payment record
    const payment = await this.prisma.payment.create({
      data: {
        invoiceId,
        amount: dto.amount,
        method: dto.method,
        gateway: dto.gateway,
        transactionRef: dto.transactionRef,
        note: dto.note,
        status: 'SUCCESS',
        paidAt: new Date(),
      },
    });

    // ✅ Step 5: Update invoice status if fully paid
    if (newTotal >= invoice.amount) {
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'PAID',
          paidAt: new Date(),
        },
      });
    }

    return payment;
  } catch (err: any) {
    if (err.code === 'P2002') {
      throw new BadRequestException('Duplicate transaction reference');
    }
    throw new InternalServerErrorException('Failed to add payment');
  }
}


  async listPayments(query: QueryPaymentsDto, user: any) {
    this.assertCanManageInvoices(user);

    const page = Math.max(parseInt(query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(query.limit || '20', 10), 1), 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.q) {
      where.OR = [
        { transactionRef: { contains: query.q, mode: 'insensitive' } },
        { gateway: { contains: query.q, mode: 'insensitive' } },
        { note: { contains: query.q, mode: 'insensitive' } },
        { invoice: { reference: { contains: query.q, mode: 'insensitive' } } },
      ];
    }

    try {
      const [total, data] = await this.prisma.$transaction([
        this.prisma.payment.count({ where }),
        this.prisma.payment.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: { invoice: { include: { patient: true } } },
        }),
      ]);

      return { meta: { total, page, limit, pages: Math.ceil(total / limit) }, data };
    } catch (err) {
      this.logger.error('Failed to list payments', err);
      throw new InternalServerErrorException('Failed to fetch payments');
    }
  }
}
