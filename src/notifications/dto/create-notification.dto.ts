import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsMongoId,
} from 'class-validator';
import { NotificationType } from '../schemas/notification.schema';

export class CreateNotificationDto {
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsMongoId()
  @IsOptional()
  taskId?: string;

  @IsMongoId()
  @IsOptional()
  fromUserId?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}
