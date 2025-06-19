import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Role } from '../interfaces/role.enum';

export type UserDocument = User & Document;

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } })
export class User {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;
  @Prop({ default: Role.USER, enum: Role, type: String })
  role: Role;

  @Prop({ type: Date, default: null })
  emailVerifiedAt: Date | null;

  @Prop({ required: false })
  phone?: string;

  @Prop({ required: false })
  address?: string;

  @Prop({ required: false })
  bio?: string;

  @Prop({ type: [String], default: [] })
  skills?: string[];

  @Prop({ required: false })
  profilePicture?: string;

  @Prop({ type: Number, default: 0 })
  balance: number;

  // Add timestamps explicitly
  createdAt: Date;

  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Add a virtual 'id' property that returns the _id as a string
UserSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
UserSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    delete ret.password;
    return ret;
  },
});
