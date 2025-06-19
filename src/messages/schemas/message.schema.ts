import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } })
export class Message {
  @Prop({ required: true, type: String })
  senderId: string;

  @Prop({ required: true, type: String })
  receiverId: string;

  @Prop({ required: true })
  content: string;

  @Prop({ default: false })
  read: boolean;

  // Add timestamps explicitly
  createdAt: Date;
  updatedAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    delete ret._id;
    return ret;
  },
});
