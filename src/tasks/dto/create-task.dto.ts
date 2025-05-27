import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  IsDateString,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { TaskStatus } from '../schemas/task.schema';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsDateString()
  dueDate?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  // Status will be set to OPEN by default in the service/schema, not provided by user on creation
  // postedBy will be set from the authenticated user in the service
}
