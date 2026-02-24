import { IsEnum, IsOptional, IsString, IsArray, IsUUID, MaxLength } from 'class-validator';

export enum RoomTypeDto {
  DM = 'DM',
  GROUP = 'GROUP',
}

export class CreateRoomDto {
  @IsEnum(RoomTypeDto)
  type: RoomTypeDto;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  participantIds: string[];
}
