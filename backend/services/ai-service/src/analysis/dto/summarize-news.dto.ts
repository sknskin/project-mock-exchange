import { Type } from 'class-transformer';
import { IsArray, ValidateNested, IsString, IsOptional, MaxLength, ArrayMaxSize, IsIn } from 'class-validator';

export class NewsItemDto {
  @IsString()
  @MaxLength(500)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary: string | null;

  @IsString()
  @MaxLength(100)
  source: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  publishedAt: string | null;
}

export class SummarizeNewsDto {
  @IsString()
  @IsIn(['CRYPTO', 'DOMESTIC_STOCK', 'FOREIGN_STOCK'])
  category: string;

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => NewsItemDto)
  newsItems: NewsItemDto[];

  @IsOptional()
  @IsString()
  @IsIn(['ko', 'en'])
  locale?: string;
}
