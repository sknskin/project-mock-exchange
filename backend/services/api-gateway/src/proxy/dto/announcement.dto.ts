/**
 * @file 공지사항 프록시 DTO
 * @description API Gateway 레벨에서 공지사항 관련 요청 body를 검증하는 DTO
 *
 * @file Announcement Proxy DTOs
 * @description Validates announcement-related request bodies at API Gateway level
 */
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  MaxLength,
} from 'class-validator';

/** 공지사항 생성 DTO
 * Create announcement DTO */
export class CreateAnnouncementDto {
  /** 공지 제목
   * Announcement title */
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  /** 공지 본문
   * Announcement content */
  @IsString()
  @IsNotEmpty()
  content: string;

  /** 상단 고정 여부 (선택)
   * Whether to pin to top (optional) */
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}

/** 공지사항 수정 DTO
 * Update announcement DTO */
export class UpdateAnnouncementDto {
  /** 공지 제목
   * Announcement title */
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  /** 공지 본문
   * Announcement content */
  @IsString()
  @IsNotEmpty()
  content: string;

  /** 상단 고정 여부 (선택)
   * Whether to pin to top (optional) */
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}

/** 공지사��� 댓글 DTO
 * Announcement comment DTO */
export class AnnouncementCommentDto {
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

/** 공지사항 첨부파일 업로드 DTO
 * Announcement attachment upload DTO */
export class AnnouncementAttachmentDto {
  /** 원본 파일명
   * Original file name */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  originalName: string;

  /** MIME 타입
   * MIME type */
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  /** 파일 크기 (바이트)
   * File size in bytes */
  @IsNumber()
  size: number;

  /** 파일 데이터 (Base64 등)
   * File data (Base64 etc.) */
  @IsString()
  @IsNotEmpty()
  data: string;
}
