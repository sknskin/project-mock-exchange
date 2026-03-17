/**
 * @file 커뮤니티 게시판 DTO
 * @description 커뮤니티 게시글/댓글의 유효성을 검증하는 Data Transfer Objects
 *
 * @file Community Board DTOs
 * @description Data Transfer Objects for validating community post/comment requests
 */
import { IsString, IsNotEmpty, IsOptional, MaxLength, MinLength, IsIn, ValidateIf } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50000)
  content: string;

  @IsString()
  @IsOptional()
  @IsIn(['FREE', 'INFO', 'QUESTION', 'STRATEGY', 'ANALYSIS', 'PROOF'])
  category?: string;

  @IsString()
  @IsOptional()
  @IsIn(['PUBLIC', 'MEMBERS_ONLY'])
  visibility?: string;
}

export class UpdatePostDto {
  @IsString()
  @IsOptional()
  @ValidateIf((o) => o.title !== undefined)
  @MinLength(2)
  title?: string;

  @IsString()
  @IsOptional()
  @ValidateIf((o) => o.content !== undefined)
  @MinLength(2)
  content?: string;

  @IsString()
  @IsOptional()
  @IsIn(['FREE', 'INFO', 'QUESTION', 'STRATEGY', 'ANALYSIS', 'PROOF'])
  category?: string;

  @IsString()
  @IsOptional()
  @IsIn(['PUBLIC', 'MEMBERS_ONLY'])
  visibility?: string;
}

export class CreateCommentDto {
  // VAL-M-02: 댓글 최대 2000자 제한 / Comment max 2000 characters
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(2000)
  content: string;

  @IsString()
  @IsOptional()
  parentId?: string;
}
