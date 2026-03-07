import { Type } from 'class-transformer';
import { IsArray, ValidateNested, IsString, IsNumber, MaxLength, Matches, Min, ArrayMaxSize } from 'class-validator';

export class HoldingItemDto {
  @IsString()
  @MaxLength(20)
  @Matches(/^[A-Z0-9]{1,10}([.-][A-Z]{1,4})?(-USD)?$/, { message: 'Invalid symbol format' })
  symbol: string;

  @IsNumber()
  @Min(0)
  value: number;
}

export class AnalyzePortfolioDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => HoldingItemDto)
  holdings: HoldingItemDto[];
}
