/**
 * @file 전략 프록시 DTO
 * @description API Gateway 레벨에서 전략 관련 요청 body를 검증하는 DTO
 *
 * @file Strategy Proxy DTOs
 * @description Validates strategy-related request bodies at API Gateway level
 */
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/** 전략 생성 DTO
 * Create strategy DTO */
export class CreateStrategyDto {
  /** 종목 심볼
   * Stock/crypto symbol */
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  symbol: string;

  /** 전략 제목
   * Strategy title */
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  /** 전략 설명
   * Strategy description */
  @IsString()
  @IsNotEmpty()
  description: string;

  /** 수익률 (선택)
   * Performance percentage (optional) */
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  performance?: number;
}

/** 전략 수정 DTO
 * Update strategy DTO */
export class UpdateStrategyDto {
  /** 종목 심볼 (선택)
   * Stock/crypto symbol (optional) */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  symbol?: string;

  /** 전략 제목 (선택)
   * Strategy title (optional) */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  /** 전략 설명 (선택)
   * Strategy description (optional) */
  @IsOptional()
  @IsString()
  description?: string;

  /** 수익률 (선택)
   * Performance percentage (optional) */
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  performance?: number;
}

/** 전략 댓글 생성 DTO
 * Create strategy comment DTO */
export class CreateStrategyCommentDto {
  /** 댓글 내용
   * Comment content */
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;

  /** 부모 댓글 ID (대댓글 시 사용, 선택)
   * Parent comment ID (for replies, optional) */
  @IsOptional()
  @IsString()
  parentId?: string;
}
