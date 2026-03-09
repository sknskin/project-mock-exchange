/**
 * @file 전략 공유 DTO
 * @description 전략 공유 게시글/댓글의 유효성을 검증하는 Data Transfer Objects
 *
 * @file Strategy Sharing DTOs
 * @description Data Transfer Objects for validating strategy sharing post/comment requests
 */
import { IsString, IsNotEmpty, IsOptional, MaxLength, IsNumber } from 'class-validator';

export class CreateStrategyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  symbol: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @IsOptional()
  performance?: number;
}

export class UpdateStrategyDto {
  @IsString()
  @IsOptional()
  @MaxLength(20)
  symbol?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  performance?: number;
}

export class CreateStrategyCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  parentId?: string;
}
