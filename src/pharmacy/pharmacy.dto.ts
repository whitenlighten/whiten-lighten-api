// src/pharmacy-item/dto/create-pharmacy-item.dto.ts

import { IsString, IsOptional, IsNumber, Min, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger'; // ⬅️ IMPORT
import { Transform } from 'class-transformer';

export class CreatePharmacyItemDto {
  @ApiProperty({ 
    description: 'Unique Stock Keeping Unit of the item',
    example: 'SKU-001A-B',
  }) // ⬅️ SWAGGER
  @IsNotEmpty()
  @IsString() 
  sku!: string;

  @ApiProperty({ 
    description: 'The name of the pharmacy item (e.g., Paracetamol, Bandage)',
    example: 'Aspirin 500mg',
  }) // ⬅️ SWAGGER
  @IsNotEmpty()
  @IsString() 
  name!: string;

  @ApiProperty({ 
    description: 'Detailed description of the item',
    required: false,
    example: 'Non-steroidal anti-inflammatory drug (NSAID) for pain relief.',
  }) // ⬅️ SWAGGER
  @IsOptional() 
  @IsString() 
  description?: string;

  @ApiProperty({ 
    description: 'Price per unit (must be non-negative)',
    example: 12.50,
    minimum: 0,
    type: Number,
  }) // ⬅️ SWAGGER
  @IsNumber() 
  @Min(0) 
  unitPrice!: number;

  @ApiProperty({ 
    description: 'Current stock quantity (must be non-negative)',
    example: 500,
    minimum: 0,
    type: Number,
  }) // ⬅️ SWAGGER
  @IsNumber() 
  @Min(0) 
  stock!: number;
}


export class UpdatePharmacyItemDto extends PartialType(CreatePharmacyItemDto) {
    // You can add update-specific fields here if needed
}

export class ListPharmacyItemsQueryDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @ApiProperty({ required: false, description: 'Filter items where stock is below or equal to this threshold.' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(0)
  lowStock?: number;
}

export class RegisterSaleDto {
  @ApiProperty({ description: 'The UUID of the item being sold.', example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef' })
  @IsUUID()
  itemId!: string;

  @ApiProperty({ description: 'The quantity being purchased.', example: 5, minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity!: number;
}