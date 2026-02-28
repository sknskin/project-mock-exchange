/**
 * @file 회원가입 DTO
 * @description 회원가입 요청의 유효성을 검증하는 Data Transfer Object
 *
 * @file Register DTO
 * @description Data Transfer Object for validating registration requests
 */
import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterRequestDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers, and underscores',
  })
  username: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/(?=.*[a-z])/, { message: 'Password must contain a lowercase letter' })
  @Matches(/(?=.*\d)/, { message: 'Password must contain a number' })
  @Matches(/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/, { message: 'Password must contain a special character' })
  password: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  passwordConfirm: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @IsString()
  @Matches(/^01[016789]\d{7,8}$/, {
    message: 'Invalid Korean phone number format',
  })
  phone: string;

  @IsString()
  residentNumber: string;

  @IsString()
  address: string;

  @IsString()
  addressDetail: string;

  @IsString()
  zipCode: string;
}
