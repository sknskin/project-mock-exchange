/**
 * @file 커뮤니티 게시판 DTO
 * @description 커뮤니티 게시글/댓글의 유효성을 검증하는 Data Transfer Objects
 *
 * @file Community Board DTOs
 * @description Data Transfer Objects for validating community post/comment requests
 */
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  category?: string;
}

export class UpdatePostDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  category?: string;
}

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  parentId?: string;
}
