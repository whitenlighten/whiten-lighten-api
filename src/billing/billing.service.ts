import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  Logger,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import {
  CreateInvoiceDto,
  QueryInvoicesDto,
  AddPaymentDto,
  // QueryPaymentsDto (assuming this is defined elsewhere)
} from './billing.dto';
import { InvoiceStatus, PaymentMethod, Role } from '@prisma/client';
import { AuditTrailService } from 'src/audit-trail/auditTrail.service';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private auditTrailService: AuditTrailService, // Required for security/compliance logging
    // NOTE: A PaymentGatewayService would be injected here for real-time initiation
  ) {}

  // --- 🔒 RBAC Helpers ---
  
  /** Guards access to staff-only methods. */
  private assertCanManageInvoices(user: any) {
    if (![Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE].includes(user.role)) {
      throw new ForbiddenException('You are not allowed to manage invoices');
    }
  }

  /** Guards a patient's access to ensure they only view their own records. */
  private assertCanViewInvoice(user: any, patientId: string) {
    // Note: Staff roles implicitly pass this check based on `assertCanManageInvoices` usually being called first.
    // If a non-staff user is a PATIENT, their ID must match the invoice's patientId.
    if (user.role === Role.PATIENT && user.id !== patientId) {
      throw new ForbiddenException('You may only view your own invoices.');
    }
  }

  // -------------------------
  // 📝 INVOICES
  // -------------------------
  
  /** Creates a new invoice record and logs the action. */
  async createInvoice(dto: CreateInvoiceDto, user: any) {
    this.assertCanManageInvoices(user);

    try {
      const patient = await this.prisma.patient.findUnique({ where: { id: dto.patientId } });
      if (!patient) throw new NotFoundException('Patient not found');

      const invoice = await this.prisma.invoice.create({
        data: {
          patientId: dto.patientId,
          createdById: user.id, // Tracks the staff member who created it
          amount: dto.amount,
          currency: dto.currency ?? 'NGN',
          description: dto.description,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          reference: dto.reference, // Custom reference number
          status: InvoiceStatus.UNPAID,
        },
      });

      // Log invoice creation for compliance
      await this.auditTrailService.log(
        'BILLING_INVOICE_CREATED', 
        'Invoice',     
        invoice.id,         
        user, 
        { reference: invoice.reference, patientId: invoice.patientId, amount: invoice.amount }
      );

      this.logger.log(`Invoice created: ${invoice.id} by ${user.id}`);
      return invoice;
    } catch (err: any) {   
      if (err.code === 'P2002') {
        // P2002 is Prisma's code for a unique constraint violation (e.g., duplicate reference)
        throw new BadRequestException('Invoice reference already exists');
      }
      throw err instanceof NotFoundException ? err : new InternalServerErrorException('Failed to create invoice');
    }
  }

  /** Lists invoices with pagination, filtering, and role-based access control. */
  async listInvoices(query: QueryInvoicesDto, user: any) {
    // Note: Staff can manage (list) all, Patient can only list their own.
    const { patientId, status, page = 1, limit = 20 } = query;
    const where: any = {};

    // Patient Role Filter (Overrides any other patientId query to ensure security)
    if (user.role === Role.PATIENT) {
      where.patientId = user.id;
    } else {
      // Staff Role Filter
      this.assertCanManageInvoices(user);
      if (patientId) where.patientId = patientId;
    }
    
    if (status) where.status = status;

    const [invoices, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { patient: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  /** Retrieves a single invoice, performing an ownership check. */
  async getInvoice(id: string, user: any) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
        payments: true,
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    // Enforce ownership check
    this.assertCanViewInvoice(user, invoice.patient.id);

    return invoice;
  }

  // -------------------------
  // 💳 PAYMENTS (MANUAL/BOOKKEEPING)
  // -------------------------
  
  /** * Records a manual payment (cash, POS, bank transfer) initiated by a staff member.
   * This is a critical bookkeeping function using an atomic transaction.
   */
  async addPayment(invoiceId: string, dto: AddPaymentDto, user: any) {
    this.assertCanManageInvoices(user); // Only authorized staff can manually add payments

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });

    if (!invoice) throw new NotFoundException(`Invoice with ID ${invoiceId} not found`);
    if (dto.amount <= 0) throw new BadRequestException('Amount must be positive');
    // Basic validation of the payment method enum
    if (!(Object.values(PaymentMethod) as string[]).includes(dto.method)) {
      throw new BadRequestException('Invalid payment method');
    }

    // Calculate new total paid amount
    const alreadyPaid = invoice.payments
      .filter(p => p.status === 'SUCCESS')
      .reduce((sum, p) => sum + p.amount, 0);

    const newTotal = alreadyPaid + dto.amount;

    try {
      // Use a Prisma transaction to ensure payment creation and invoice update are atomic
      return this.prisma.$transaction(async (tx) => {
        
        // 1. Create new payment record (Status is immediately SUCCESS for manual payments)
        const payment = await tx.payment.create({
          data: {
            invoiceId,
            amount: dto.amount,
            method: dto.method,
            gateway: dto.gateway,
            transactionRef: dto.transactionRef,
            note: dto.note,
            status: 'SUCCESS',
            paidAt: new Date(),
            createdById: user.id, // Actor who recorded the payment
          },
        });

        // 2. Determine and update the invoice status
        let newInvoiceStatus = invoice.status;
        
        if (newTotal >= invoice.amount) {
          newInvoiceStatus = InvoiceStatus.PAID;
          await tx.invoice.update({
            where: { id: invoiceId },
            data: { status: newInvoiceStatus, paidAt: new Date() },
          });
        } else if (newTotal > 0 && invoice.amount > newTotal) {
          newInvoiceStatus = InvoiceStatus.PARTIALLY_PAID;
          await tx.invoice.update({
            where: { id: invoiceId },
            data: { status: newInvoiceStatus },
          });
        }

        // 3. Log the action (Audit Trail)
        await this.auditTrailService.log(
          'BILLING_PAYMENT', 
          'Payment',     
          payment.id,         
          user, 
          { 
            invoiceId: invoiceId, 
            amount: payment.amount,
            newInvoiceStatus: newInvoiceStatus,
            method: payment.method
          }
        );
        
        return payment;
      });

    } catch (err: any) {
      this.logger.error('Failed to process manual payment transaction', err);
      if (err.code === 'P2002') {
        // Handle unique constraint error if transactionRef is duplicated
        throw new BadRequestException('Duplicate transaction reference');
      }
      throw new InternalServerErrorException('Failed to add payment');
    }
  }

  // -------------------------
  // 📡 PAYMENTS (WEBHOOK RECONCILIATION)
  // -------------------------

  /** * Handles asynchronous payment confirmations (webhooks) from a payment gateway.
   * NOTE: This method would be exposed via a dedicated controller route (e.g., POST /webhooks/paystack)
   * and MUST include signature verification in a production system.
   */
  async handlePaymentWebhook(payload: any) {
    this.logger.debug('Received payment webhook', JSON.stringify(payload?.event));
    
    // 1. **CRITICAL SECURITY STEP:** VERIFY WEBHOOK SIGNATURE HERE!
    // If verification fails, return 400 immediately.

    try {
      // Extract the transaction reference/ID from the payload
      const transactionRef = payload?.data?.reference;
      
      if (!transactionRef) return { status: 'ignored' };

      // 2. Fetch the corresponding invoice using the reference
      const invoice = await this.prisma.invoice.findUnique({ where: { reference: transactionRef } });
      if (!invoice) {
        this.logger.warn(`Invoice not found for reference: ${transactionRef}`);
        return { status: 'no-op' };
      }

      // 3. Check if the payment was successful based on the gateway's event/status
      if (payload?.event === 'charge.success' && invoice.status !== InvoiceStatus.PAID) {
        
        // 4. Use a transaction to update records
        await this.prisma.$transaction(async (tx) => {
          
          // Create Payment Record (The gateway provides the successful details)
          const payment = await tx.payment.create({
            data: {
              invoiceId: invoice.id,
              amount: payload.data.amount / 100, // IMPORTANT: Convert kobo/cents to primary currency unit
              method: PaymentMethod.GATEWAY, 
              gateway: 'Paystack', // Or from payload metadata
              transactionRef: transactionRef,
              status: 'SUCCESS',
              paidAt: new Date(),
            },
          });

          // Update the Invoice Status
          await tx.invoice.update({
            where: { id: invoice.id },
            data: { status: InvoiceStatus.PAID, paidAt: new Date() },
          });

          // Log the action (Audit Trail)
          await this.auditTrailService.log('BILLING_WEBHOOK_PAID', 'Payment', payment.id, null, { invoiceId: invoice.id, ref: transactionRef });
        });
        
        this.logger.log(`Invoice ${invoice.id} marked PAID via webhook.`);
      }

      return { status: 'ok' };

    } catch (err: any) {
      this.logger.error('handlePaymentWebhook failed', err?.stack ?? err);
      // Return 200/OK so the gateway doesn't keep retrying, but log the failure internally.
      throw new InternalServerErrorException('Webhook handling failed'); 
    }
  }
}