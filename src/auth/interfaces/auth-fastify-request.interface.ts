import { FastifyRequest } from 'fastify';
import { JwtAccessPayload } from './jwt-payload.interface';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { Document, Types } from 'mongoose';

// Define a type that ensures _id is explicitly included
export type UserWithId = UserDocument & {
  _id: Types.ObjectId;
};

export interface AuthFastifyRequest extends FastifyRequest {
  user: UserWithId;
  cookies: {
    [key: string]: string;
  };
}

export interface LoginFastifyRequest extends FastifyRequest {
  user: Omit<UserDocument, 'password'>;
  cookies: {
    [key: string]: string;
  };
}
