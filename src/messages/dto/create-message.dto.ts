import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateMessageDto {
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  receiverId: string;

  @IsNotEmpty()
  @IsString()
  content: string;
}
