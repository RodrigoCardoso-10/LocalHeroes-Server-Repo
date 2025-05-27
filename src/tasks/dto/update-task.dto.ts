import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  IsDateString,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { TaskStatus } from '../schemas/task.schema';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  // acceptedBy could be updated via a separate endpoint/logic
}
