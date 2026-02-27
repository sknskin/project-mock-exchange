import { IsString, IsNotEmpty, Length, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @IsString()
  @IsNotEmpty()
  identifier: string;
}

export class ForgotPasswordVerifySmsDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @Length(6, 6)
  code: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @MinLength(8)
  newPassword: string;

  @IsString()
  @MinLength(8)
  confirmPassword: string;
}
