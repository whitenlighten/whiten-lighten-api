import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateInvoiceDto, QueryInvoicesDto, AddPaymentDto, QueryPaymentsDto } from './billing.dto';
import { InvoiceStatus, PaymentMethod, Role } from '@prisma/client';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  // RBAC helper: only Admin/Frontdesk/Doctor/Nurse can create invoices
  private assertCanManageInvoices(user: any) {
    if (
      ![
        Role.SUPERADMIN,
        Role.ADMIN,
        Role.FRONTDESK,
        Role.DOCTOR,
        Role.NURSE,
      ].includes(user.role)
    ) {
      throw new ForbiddenException('You are not allowed to manage invoices');
    }
  }

  // Patients can only fetch their own invoices
  private assertCanViewInvoice(user: any, invoicePatientId: string) {
    if (user.role === Role.PATIENT && user.id !== invoicePatientId) {
      throw new ForbiddenException('You may only view your own invoices.');
    }
  }

  /** Create a new invoice for a patient */
  async createInvoice(dto: CreateInvoiceDto, user: any) {
    this.assertCanManageInvoices(user);
    console.log('[BillingService.createInvoice] dto=', dto, 'by=', user?.id);

    try {
      // 1) validate patient exists
      const patient = await this.prisma.patient.findUnique({ where: { id: dto.patientId } });
      if (!patient) throw new NotFoundException('Patient not found');

      // 2) create invoice
      const invoice = await this.prisma.invoice.create({
        data: {
          patientId: dto.patientId,
          amount: dto.amount,
          currency: dto.currency ?? 'NGN',
          description: dto.description,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          reference: dto.reference ?? undefined,
          status: InvoiceStatus.UNPAID,
        },
      });

      console.log('[BillingService.createInvoice] created invoice=', invoice.id);
      return invoice;
    } catch (err: any) {
      console.error('[BillingService.createInvoice] error:', err?.message || err);
      if (err instanceof NotFoundException) throw err;
      if (err.code === 'P2002') {
        // unique constraint (e.g. reference)
        throw new BadRequestException('Invoice reference already exists');
      }
      throw new InternalServerErrorException('Failed to create invoice');
    }
  }

  /** List invoices with search & pagination */
  async listInvoices(query: QueryInvoicesDto, user: any) {
    this.assertCanManageInvoices(user);
    console.log('[BillingService.listInvoices] query=', query, 'by=', user?.id);

    const page = Math.max(parseInt(query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(query.limit || '20', 10), 1), 100);
    const skip = (page - 1) * limit;

    // search across patient name/email/reference
    const where: any = {};
    if (query.q) {
      where.OR = [
        { reference: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
        { patient: { email: { contains: query.q, mode: 'insensitive' } } },
        { patient: { firstName: { contains: query.q, mode: 'insensitive' } } },
        { patient: { lastName: { contains: query.q, mode: 'insensitive' } } },
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

      return {
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
        data,
      };
    } catch (err) {
      console.error('[BillingService.listInvoices] error:', err);
      throw new InternalServerErrorException('Failed to fetch invoices');
    }
  }

  /** Get a single invoice (with payments) */
  async getInvoice(id: string, user: any) {
    console.log('[BillingService.getInvoice] id=', id, 'by=', user?.id);
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true, userId: true } },
        payments: true,
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    // if user is patient, ensure ownership
    this.assertCanViewInvoice(user, invoice.patientId);

    return invoice;
  }

  /** Add a payment to an invoice and update invoice status if fully paid */
  async addPayment(invoiceId: string, dto: AddPaymentDto, user: any) {
    this.assertCanManageInvoices(user);
    console.log('[BillingService.addPayment] invoiceId=', invoiceId, 'dto=', dto, 'by=', user?.id);

    // basic validation
    if (dto.amount <= 0) throw new BadRequestException('Amount must be positive');
    if (!(Object.values(PaymentMethod) as string[]).includes(dto.method)) {
      throw new BadRequestException('Invalid payment method');
    }

    try {
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { payments: true },
      });
      if (!invoice) throw new NotFoundException('Invoice not found');

      const alreadyPaid = invoice.payments
        .filter((p) => p.status === 'SUCCESS')
        .reduce((sum, p) => sum + p.amount, 0);

      const newPaidTotal = alreadyPaid + dto.amount;

      // create the payment as SUCCESS (for manual/admin ops; gateways would start as PENDING)
      const payment = await this.prisma.payment.create({
        data: {
          invoiceId,
          amount: dto.amount,
          method: dto.method,
          status: 'SUCCESS',
          gateway: dto.gateway,
          transactionRef: dto.transactionRef,
          note: dto.note,
          paidAt: new Date(),
        },
      });

      // set invoice status if fully covered
      if (newPaidTotal >= invoice.amount) {
        await this.prisma.invoice.update({
          where: { id: invoiceId },
          data: { status: 'PAID', paidAt: new Date() },
        });
      }

      console.log('[BillingService.addPayment] payment created=', payment.id);
      return payment;
    } catch (err: any) {
      console.error('[BillingService.addPayment] error:', err?.message || err);
      if (err instanceof NotFoundException || err instanceof BadRequestException) throw err;
      if (err.code === 'P2002') {
        // unique conflict (e.g., transactionRef)
        throw new BadRequestException('Duplicate transaction reference');
      }
      throw new InternalServerErrorException('Failed to add payment');
    }
  }

  /** List payments (admin/staff only) with pagination + search */
  async listPayments(query: QueryPaymentsDto, user: any) {
    this.assertCanManageInvoices(user);
    console.log('[BillingService.listPayments] query=', query, 'by=', user?.id);

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
          include: {
            invoice: {
              select: {
                id: true,
                reference: true,
                amount: true,
                status: true,
                patient: { select: { id: true, firstName: true, lastName: true, email: true } },
              },
            },
          },
        }),
      ]);

      return {
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
        data,
      };
    } catch (err) {
      console.error('[BillingService.listPayments] error:', err);
      throw new InternalServerErrorException('Failed to fetch payments');
    }
  }
}
