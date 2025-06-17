import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { UserDocument } from '../../users/schemas/user.schema';

export enum TaskStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true })
export class Task extends Document {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({
    type: String,
    enum: Object.values(TaskStatus),
    default: TaskStatus.OPEN,
  })
  status: TaskStatus;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  postedBy: UserDocument | Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  acceptedBy?: UserDocument | Types.ObjectId | null;

  @Prop([{ type: MongooseSchema.Types.ObjectId, ref: 'User' }])
  applications?: Types.ObjectId[];

  @Prop({ trim: true })
  location?: string; // Simple text location for now

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop()
  dueDate?: Date;
  @Prop({ trim: true })
  category?: string;

  @Prop([String])
  tags?: string[];

  @Prop({ trim: true })
  experienceLevel?: string;
}

export const TaskSchema = SchemaFactory.createForClass(Task);

// Define PopulatedTask type
export type PopulatedTask = Task & {
  postedBy: UserDocument;
  acceptedBy?: UserDocument | null;
};
