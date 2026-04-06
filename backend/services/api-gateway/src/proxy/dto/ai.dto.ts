/**
 * @file AI 프록시 DTO
 * @description API Gateway 레벨에서 AI 분석 관련 요청 body를 검증하는 DTO
 *              다운스트림 ai-service의 AnalyzePortfolioDto, SummarizeNewsDto와 동일한 구조
 *
 * @file AI Proxy DTOs
 * @description Validates AI analysis-related request bodies at API Gateway level
 *              Mirrors the downstream ai-service AnalyzePortfolioDto and SummarizeNewsDto
 */
import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsIn,
  MaxLength,
  Min,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/** 보유 종목 항목 DTO
 * Holding item DTO */
export class HoldingItemDto {
  /** 종목 심볼
   * Stock/crypto symbol */
  @IsString()
  @MaxLength(20)
  symbol: string;

  /** 보유 가치
   * Holding value */
  @IsNumber()
  @Min(0)
  value: number;
}

/** 포트폴리오 AI 분석 요청 DTO
 * Portfolio AI analysis request DTO */
export class AnalyzePortfolioDto {
  /** 보유 종목 목록 (최대 100개)
   * List of holdings (max 100) */
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => HoldingItemDto)
  holdings: HoldingItemDto[];
}

/** 뉴스 항목 DTO
 * News item DTO */
export class NewsItemDto {
  /** 뉴스 제목
   * News title */
  @IsString()
  @MaxLength(500)
  title: string;

  /** 뉴스 요약 (선택)
   * News summary (optional) */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary: string | null;

  /** 뉴스 출처
   * News source */
  @IsString()
  @MaxLength(100)
  source: string;

  /** 발행 일시 (선택)
   * Published date (optional) */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  publishedAt: string | null;
}

/** 뉴스 AI 요약 요청 DTO
 * News AI summary request DTO */
export class SummarizeNewsDto {
  /** 카테고리
   * Category */
  @IsString()
  @IsIn(['CRYPTO', 'DOMESTIC_STOCK', 'FOREIGN_STOCK'])
  category: string;

  /** 뉴스 항목 목록 (최대 50개)
   * List of news items (max 50) */
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => NewsItemDto)
  newsItems: NewsItemDto[];

  /** 언어 설정 (선택)
   * Locale setting (optional) */
  @IsOptional()
  @IsString()
  @IsIn(['ko', 'en'])
  locale?: string;
}
