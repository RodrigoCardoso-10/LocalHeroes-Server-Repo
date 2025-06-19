import { IsNotEmpty, IsOptional, IsString, IsMongoId } from 'class-validator';

export class GetMessagesDto {
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  userId: string;

  @IsOptional()
  @IsString()
  @IsMongoId()
  otherUserId?: string;
}
