import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { User, UserSchema } from '../src/users/schemas/user.schema';
import {
  RefreshToken,
  RefreshTokenSchema,
} from '../src/refresh-tokens/schemas/refresh-token.schema';
import dbConfig from '../src/config/db.config';
import 'dotenv/config';

export function getTestDbConfig() {
  const testDbName = 'test_db';

  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
  process.env.JWT_PASSWORD_SECRET = 'test-jwt-password-secret';
  process.env.COOKIE_SECRET = 'test-cookie-secret';

  const host = process.env.MONGO_HOST || 'localhost';
  const port = process.env.MONGO_PORT || '27017';
  const username = process.env.MONGO_USERNAME || '';
  const password = process.env.MONGO_PASSWORD || '';

  process.env.MONGO_DB = testDbName;

  // Build MongoDB URI
  const uri =
    username && password
      ? `mongodb://${username}:${password}@${host}:${port}/${testDbName}`
      : `mongodb://${host}:${port}/${testDbName}`;

  return {
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [dbConfig],
      }),
      MongooseModule.forRoot(uri),
      MongooseModule.forFeature([
        { name: User.name, schema: UserSchema },
        { name: RefreshToken.name, schema: RefreshTokenSchema },
      ]),
    ],
  };
}
