import { IsString, IsNotEmpty, Length } from 'class-validator';

export class VerifyLoginSmsDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @Length(6, 6)
  code: string;
}
