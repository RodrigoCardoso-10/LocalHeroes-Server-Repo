import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';

@Injectable()
export class ParseObjectIdPipe
  implements PipeTransform<string, Types.ObjectId>
{
  transform(value: string, metadata: ArgumentMetadata): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(
        `Invalid ID format for field ${metadata.data || 'id'}`,
      );
    }
    return new Types.ObjectId(value);
  }
}
