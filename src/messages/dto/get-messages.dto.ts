import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class GetMessagesDto {
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsString()
  @IsUUID()
  otherUserId?: string;
}
