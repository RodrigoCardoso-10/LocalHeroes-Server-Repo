import { FastifyRequest } from 'fastify';
import { JwtAccessPayload } from './jwt-payload.interface';
import { User } from '../../users/schemas/user.schema';

export interface AuthFastifyRequest extends FastifyRequest {
  user: JwtAccessPayload;
  cookies: {
    [key: string]: string;
  };
}

export interface LoginFastifyRequest extends FastifyRequest {
  user: Omit<User, 'password'>;
  cookies: {
    [key: string]: string;
  };
}
