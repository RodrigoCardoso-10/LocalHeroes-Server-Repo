import { IsNotEmpty, IsString, IsMongoId } from 'class-validator';

export class CreateMessageDto {
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  receiverId: string;

  @IsNotEmpty()
  @IsString()
  content: string;
}
