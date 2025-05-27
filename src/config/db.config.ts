import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  uri: process.env.DB_URL,
  useNewUrlParser: true,
  useUnifiedTopology: true,
}));
