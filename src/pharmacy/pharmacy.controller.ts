// src/pharmacy-item/pharmacy-item.controller.ts

import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  HttpCode, 
  HttpStatus, 
  UseGuards, 
  ParseUUIDPipe, 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';

import { PharmacyService } from './pharmacy.service';
import { CreatePharmacyItemDto, ListPharmacyItemsQueryDto, RegisterSaleDto, UpdatePharmacyItemDto } from './pharmacy.dto';
// Assumed Authentication & Authorization Imports:
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../auth/guards/roles.guard';
// import { User } from '../auth/decorators/user.decorator'; // Custom user decorator

@ApiTags('Pharmacy Inventory')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard, RolesGuard) 
@Controller('pharmacy-items')
export class PharmacyItemController {
  constructor(
    private readonly pharmacyService: PharmacyService,
  ) {}

  // --------------------------------------------------
  // 1. CREATE ITEM (Audit done in service)
  // --------------------------------------------------
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new item and add it to inventory.' })
  // @Roles(Role.MANAGER, Role.ADMIN)
  async createItem(
    @Body() createPharmacyItemDto: CreatePharmacyItemDto,
    // @User() user: any, ⬅️ Get the authenticated user object
  ) {
    // 💡 Pass the authenticated user to the service for auditing.
    const user = { id: 'test-user-id', role: 'ADMIN' }; // Placeholder
    return this.pharmacyService.createItem(createPharmacyItemDto, user);
  }

  // --------------------------------------------------
  // 2. LIST ITEMS (Read-only, no audit)
  // --------------------------------------------------
  @Get()
  @ApiOperation({ summary: 'Retrieve a list of all inventory items with filters.' })
  async listItems(@Query() query: ListPharmacyItemsQueryDto) {
    return this.pharmacyService.listItems(query);
  }

  // --------------------------------------------------
  // 3. UPDATE ITEM (Audit done in service)
  // --------------------------------------------------
  @Put(':id')
  @ApiOperation({ summary: 'Update an existing inventory item by ID.' })
  // @Roles(Role.MANAGER, Role.ADMIN)
  async updateItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePharmacyItemDto: UpdatePharmacyItemDto,
    // @User() user: any, ⬅️ Get the authenticated user object
  ) {
    // 💡 Pass the authenticated user to the service for auditing.
    const user = { id: 'test-user-id', role: 'ADMIN' }; // Placeholder
    return this.pharmacyService.updateItem(id, updatePharmacyItemDto, user);
  }

  // --------------------------------------------------
  // 4. REGISTER SALE (Audit done in service)
  // --------------------------------------------------
  @Post('sale')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a sale, decrementing item stock transactionally.' })
  // @Roles(Role.PHARMACIST, Role.MANAGER) 
  async registerSale(
    @Body() dto: RegisterSaleDto,
    // @User() user: any, ⬅️ Get the authenticated user object
  ) {
    // 💡 Pass the authenticated user to the service for auditing and createdById field.
    const user = { id: 'test-user-id', role: 'PHARMACIST' }; // Placeholder
    return this.pharmacyService.createSale(dto.itemId, dto.quantity, user);
  }
  
  // --------------------------------------------------
  // 5. DELETE ITEM (Audit done in service)
  // --------------------------------------------------
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an inventory item by ID.' })
  // @Roles(Role.ADMIN) 
  async deleteItem(
    @Param('id', ParseUUIDPipe) id: string,
    // @User() user: any, ⬅️ Get the authenticated user object
  ) {
    // 💡 Pass the authenticated user to the service for auditing.
    const user = { id: 'test-user-id', role: 'ADMIN' }; // Placeholder
    await this.pharmacyService.deleteItem(id, user);
  }

  // --------------------------------------------------
  // 6. SALES REPORT (Read-only, no audit)
  // --------------------------------------------------
  @Get('report/sales')
  @ApiOperation({ summary: 'Generate a sales report grouped by item and revenue.' })
  // @Roles(Role.MANAGER, Role.ADMIN)
  async salesReport(
    @Query('from') from?: Date, 
    @Query('to') to?: Date
  ) {
    return this.pharmacyService.salesReport(from, to);
  }
}