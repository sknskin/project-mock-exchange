import { IsArray, IsUUID } from 'class-validator';

export class InviteUserDto {
  @IsArray()
  @IsUUID('4', { each: true })
  userIds: string[];
}
