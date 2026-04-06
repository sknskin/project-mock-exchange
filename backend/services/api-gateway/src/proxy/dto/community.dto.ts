/**
 * @file 커뮤니티 프록시 DTO
 * @description API Gateway 레벨에서 커뮤니티 관련 요청 body를 검증하는 DTO
 *
 * @file Community Proxy DTOs
 * @description Validates community-related request bodies at API Gateway level
 */
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  MaxLength,
  IsIn,
} from 'class-validator';

/** 커뮤니티 게시글 생성 DTO
 * Create community post DTO */
export class CreatePostDto {
  /** 게시글 제목
   * Post title */
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  /** 게시글 본문
   * Post content */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50000)
  content: string;

  /** 카테고리 (선택)
   * Category (optional) */
  @IsOptional()
  @IsString()
  @IsIn(['FREE', 'INFO', 'QUESTION', 'STRATEGY', 'ANALYSIS', 'PROOF'])
  category?: string;

  /** 공개 범위 (선택)
   * Visibility scope (optional) */
  @IsOptional()
  @IsString()
  @IsIn(['PUBLIC', 'MEMBERS_ONLY'])
  visibility?: string;
}

/** 커뮤니티 게시글 수정 DTO
 * Update community post DTO */
export class UpdatePostDto {
  /** 게시글 제목 (선택)
   * Post title (optional) */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  /** 게시글 본문 (선택)
   * Post content (optional) */
  @IsOptional()
  @IsString()
  @MaxLength(50000)
  content?: string;

  /** 카테고리 (선택)
   * Category (optional) */
  @IsOptional()
  @IsString()
  @IsIn(['FREE', 'INFO', 'QUESTION', 'STRATEGY', 'ANALYSIS', 'PROOF'])
  category?: string;

  /** 공개 범위 (선택)
   * Visibility scope (optional) */
  @IsOptional()
  @IsString()
  @IsIn(['PUBLIC', 'MEMBERS_ONLY'])
  visibility?: string;
}

/** 커뮤니티 댓글 생성 DTO
 * Create community comment DTO */
export class CreateCommentDto {
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

/** 이미지/첨부파일 업로드 DTO
 * Image/attachment upload DTO */
export class UploadFileDto {
  /** 원본 파일명
   * Original file name */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  originalName: string;

  /** 파일 데이터 (Base64 등)
   * File data (Base64 etc.) */
  @IsString()
  @IsNotEmpty()
  data: string;

  /** MIME 타입 (선택)
   * MIME type (optional) */
  @IsOptional()
  @IsString()
  mimeType?: string;

  /** 파일 유형 (선택)
   * File type (optional) */
  @IsOptional()
  @IsString()
  type?: string;

  /** 파일 크기 (바이트, 선택)
   * File size in bytes (optional) */
  @IsOptional()
  @IsNumber()
  size?: number;
}
