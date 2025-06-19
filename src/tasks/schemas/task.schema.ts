import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { UserDocument } from '../../users/schemas/user.schema';

export enum TaskStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  PAID = 'PAID',
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

  @Prop({
    type: {
      address: { type: String, trim: true },
      point: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number],
          default: [0, 0],
        },
      },
    },
    required: false,
  })
  location?: {
    address?: string;
    point?: {
      type: 'Point';
      coordinates: [number, number];
    };
  };

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

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  applicants: Types.ObjectId[];

  @Prop({ type: Number, default: 0 })
  views: number;
}

export const TaskSchema = SchemaFactory.createForClass(Task);

// Define PopulatedTask type
export type PopulatedTask = Task & {
  postedBy: UserDocument;
  acceptedBy?: UserDocument | null;
};
