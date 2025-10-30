
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { Role } from '@prisma/client'; // Assumed from your service
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';

import { BillingService } from './billing.service';
import { CreateInvoiceDto, QueryInvoicesDto, AddPaymentDto } from './billing.dto';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { GetUser } from 'src/common/decorator/get-user.decorator';

@ApiTags('Billing & Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard) // ⬅️ Apply Auth and RBAC globally
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // =============================================================
  // 1. INVOICE CREATION
  // Restricted: FRONTDESK, ADMIN
  // =============================================================
  @Post('invoices')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.FRONTDESK, Role.ADMIN) // ⬅️ RBAC Restriction
  @ApiOperation({ summary: 'Create a new invoice for a patient.' })
  async createInvoice(
    @Body() createInvoiceDto: CreateInvoiceDto,
    @GetUser() user: any,
  ) {
    return this.billingService.createInvoice(createInvoiceDto, user);
  }

  // =============================================================
  // 2. LIST INVOICES
  // Restricted: FRONTDESK, ADMIN
  // =============================================================
  @Get('invoices')
  @Roles(Role.FRONTDESK, Role.ADMIN) // ⬅️ RBAC Restriction
  @ApiOperation({ summary: 'List all invoices with search and pagination.' })
  async listInvoices(
    @Query() query: QueryInvoicesDto, 
    @GetUser() user: any
  ) {
    // The service handles filtering based on user role (e.g., if we let PATIENT role list, 
    // the service would filter by their ID). Since the controller role limits staff, 
    // we pass the user for potential logging/context.
    return this.billingService.listInvoices(query, user);
  }

  // =============================================================
  // 3. GET SINGLE INVOICE
  // Restricted: PATIENT (own), FRONTDESK, ADMIN
  // The service handles the 'PATIENT (own)' check.
  // =============================================================
  @Get('invoices/:id')
  @Roles(Role.PATIENT, Role.FRONTDESK, Role.ADMIN) // ⬅️ RBAC Restriction
  @ApiOperation({ summary: 'Retrieve a single invoice and its payment history.' })
  async getInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: any,
  ) {
    // The service method, getInvoice(id, user), contains the logic to assert 
    // if a PATIENT user is viewing their own invoice.
    return this.billingService.getInvoice(id, user);
  }

  // =============================================================
  // 4. ADD PAYMENT
  // Restricted: PATIENT, FRONTDESK, ADMIN
  // Note: PATIENT role can be restricted to only specific online payment gateways.
  // =============================================================
  @Post('invoices/:invoiceId/payments')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.PATIENT, Role.FRONTDESK, Role.ADMIN) // ⬅️ RBAC Restriction
  @ApiOperation({ summary: 'Record a payment against an invoice.' })
  async addPayment(
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
    @Body() addPaymentDto: AddPaymentDto,
    @GetUser() user: any,
  ) {
    return this.billingService.addPayment(invoiceId, addPaymentDto, user);
  }

  // =============================================================
  // 5. EXPORT INVOICES (CSV)
  // Restricted: ADMIN only (as per requirement)
  // Uses streaming response.
  // =============================================================
  @Get('invoices/export/csv')
  @Roles(Role.ADMIN) // ⬅️ RBAC Restriction
  @ApiOperation({ summary: 'Export all filtered invoices as a CSV file.' })
  async exportInvoicesCsv(
    @Query() query: QueryInvoicesDto,
    @Res() res: Response,
  ) {
    // NOTE: In a real app, this should call a service method that generates the CSV string/stream
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="invoices_${new Date().toISOString()}.csv"`);

    const mockCsvData = "ID,Reference,Amount,Status\n1,REF-001,100.00,PAID\n2,REF-002,50.00,UNPAID";
    
    // In a real application, pipe the stream here:
    // const csvStream = this.billingService.generateInvoicesCsv(query);
    // csvStream.pipe(res);

    res.send(mockCsvData); // Mocked for demonstration
  }
}