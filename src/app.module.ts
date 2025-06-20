import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MailModule } from './mail/mail.module';
import { RefreshTokensModule } from './refresh-tokens/refresh-tokens.module';
import { MessagesModule } from './messages/messages.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import dbConfiguration from './config/db.config';
import mailerConfig from './config/mailer.config';
import { TasksModule } from './tasks/tasks.module';
import { SeedersModule } from './seeders/seeders.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AiSupportModule } from './ai-support/ai-support.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [dbConfiguration, mailerConfig],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get('database.uri'),
        // Remove deprecated options
        // useNewUrlParser: configService.get('database.useNewUrlParser'),
        // useUnifiedTopology: configService.get('database.useUnifiedTopology'),
      }),
    }),
    AuthModule,
    UsersModule,
    MailModule,
    RefreshTokensModule,
    MessagesModule,
    TasksModule,
    SeedersModule,
    NotificationsModule,
    AiSupportModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
