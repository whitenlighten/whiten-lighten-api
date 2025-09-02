// src/billing/billing.controller.ts
import {
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { Role } from '@prisma/client';
import { Controller } from '@nestjs/common';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { CreateInvoiceDto, QueryInvoicesDto, AddPaymentDto, QueryPaymentsDto } from './billing.dto';
import { GetUser } from 'src/common/decorator/get-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@ApiTags('billing')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly service: BillingService) {}

  // =====================
  // 1. Create invoice
  // =====================
  @Post('invoices')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE)
  @ApiOperation({ summary: 'Create invoice for patient' })
  @ApiResponse({ status: 201, description: 'Invoice created successfully.' })
  async createInvoice(@Body() dto: CreateInvoiceDto, @GetUser() user: any) {
    return this.service.createInvoice(dto, user);
  }

  // =====================
  // 2. List invoices
  // =====================
  @Get('invoices')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE)
  @ApiOperation({ summary: 'List invoices with filters & pagination' })
  async listInvoices(@Query() query: QueryInvoicesDto, @GetUser() user: any) {
    return this.service.listInvoices(query, user);
  }

  // =====================
  // 3. Get single invoice
  // =====================
  @Get('invoices/:id')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE, Role.PATIENT)
  @ApiOperation({ summary: 'Get invoice by ID' })
  async getInvoice(@Param('id') id: string, @GetUser() user: any) {
    return this.service.getInvoice(id, user);
  }

  // =====================
  // 4. Add payment
  // =====================
  @Post('invoices/:id/payments')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE)
  @ApiOperation({ summary: 'Add payment to an invoice' })
  async addPayment(@Param('id') invoiceId: string, @Body() dto: AddPaymentDto, @GetUser() user: any) {
    return this.service.addPayment(invoiceId, dto, user);
  }

  // =====================
  // 5. List payments
  // =====================
  @Get('payments')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE)
  @ApiOperation({ summary: 'List payments with filters & pagination' })
  async listPayments(@Query() query: QueryPaymentsDto, @GetUser() user: any) {
    return this.service.listPayments(query, user);
  }
}
