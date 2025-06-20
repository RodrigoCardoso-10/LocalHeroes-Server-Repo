import { Module } from '@nestjs/common';
import { AiSupportController } from './ai-support.controller';
import { AiSupportService } from './ai-support.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [AiSupportController],
  providers: [AiSupportService],
  exports: [AiSupportService],
})
export class AiSupportModule {}
