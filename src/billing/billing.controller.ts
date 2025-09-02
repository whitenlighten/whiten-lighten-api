import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { Role } from '@prisma/client';
import { GetUser } from 'src/common/decorator/get-user.decorator';
import { AddPaymentDto, CreateInvoiceDto, QueryInvoicesDto, QueryPaymentsDto } from './billing.dto';

@ApiTags('billing')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Post('invoices')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE)
  @ApiOperation({ summary: 'Create an invoice for a patient' })
  @ApiResponse({ status: 201, description: 'Invoice created' })
  async createInvoice(@Body() dto: CreateInvoiceDto, @GetUser() user: any) {
    return this.billing.createInvoice(dto, user);
  }

  @Get('invoices')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE)
  @ApiOperation({ summary: 'List invoices (search & pagination)' })
  async listInvoices(@Query() query: QueryInvoicesDto, @GetUser() user: any) {
    return this.billing.listInvoices(query, user);
  }

  @Get('invoices/:id')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE, Role.PATIENT)
  @ApiOperation({ summary: 'Get a single invoice (patients can only view theirs)' })
  async getInvoice(@Param('id') id: string, @GetUser() user: any) {
    return this.billing.getInvoice(id, user);
  }

  @Post('invoices/:id/payments')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK)
  @ApiOperation({ summary: 'Add a payment to an invoice' })
  async addPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPaymentDto,
    @GetUser() user: any,
  ) {
    return this.billing.addPayment(id, dto, user);
  }

  @Get('payments')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE)
  @ApiOperation({ summary: 'List payments (search & pagination)' })
  async listPayments(@Query() query: QueryPaymentsDto, @GetUser() user: any) {
    return this.billing.listPayments(query, user);
  }
}
