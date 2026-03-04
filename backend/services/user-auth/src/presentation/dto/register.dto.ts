/**
 * @file 회원가입 DTO
 * @description 회원가입 요청의 유효성을 검증하는 Data Transfer Object
 *
 * @file Register DTO
 * @description Data Transfer Object for validating registration requests
 */
import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterRequestDto {
  // 이메일 형식 자동 검증 / Automatic email format validation
  @IsEmail()
  email: string;

  // 아이디: 영문/숫자/밑줄만 허용, 3~50자 / Username: letters, numbers, underscores only, 3-50 chars
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers, and underscores',
  })
  username: string;

  // 비밀번호 정책: 소문자 + 숫자 + 특수문자 필수 / Password policy: lowercase + digit + special char required
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

  // 한국 휴대전화 번호 형식: 010/011/016/017/018/019 + 7~8자리 / Korean mobile: 010/011/016/017/018/019 + 7-8 digits
  @IsString()
  @Matches(/^01[016789]\d{7,8}$/, {
    message: 'Invalid Korean phone number format',
  })
  phone: string;

  // 주민등록번호: 생년월일 6자리 + 성별코드(1-4) + 뒷자리 6자리 / Resident registration number: 6-digit DOB + gender(1-4) + 6 digits
  @IsString()
  @Matches(/^\d{6}[1-4]\d{6}$/, { message: 'Invalid resident number format' })
  residentNumber: string;

  @IsString()
  @MaxLength(200)
  address: string;

  @IsString()
  @MaxLength(200)
  addressDetail: string;

  @IsString()
  @Matches(/^\d{5}$/, { message: 'Zip code must be 5 digits' })
  zipCode: string;
}
