import { IsString, IsNotEmpty, Length, MinLength, MaxLength, Matches } from 'class-validator';

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
  @MaxLength(128)
  @Matches(/(?=.*[a-z])/, { message: 'Password must contain a lowercase letter' })
  @Matches(/(?=.*\d)/, { message: 'Password must contain a number' })
  @Matches(/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/, { message: 'Password must contain a special character' })
  newPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  confirmPassword: string;
}
