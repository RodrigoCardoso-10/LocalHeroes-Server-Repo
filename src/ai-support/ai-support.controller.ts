import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AiSupportService } from './ai-support.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthFastifyRequest } from '../auth/interfaces/auth-fastify-request.interface';

export class ChatMessageDto {
  message: string;
  context?: any;
}

@Controller('ai-support')
@UseGuards(JwtAuthGuard)
export class AiSupportController {
  constructor(private readonly aiSupportService: AiSupportService) {}

  @Post('chat')
  async chat(
    @Body() chatMessageDto: ChatMessageDto,
    @Req() req: AuthFastifyRequest,
  ) {
    try {
      if (
        !chatMessageDto.message ||
        chatMessageDto.message.trim().length === 0
      ) {
        throw new HttpException(
          'Message cannot be empty',
          HttpStatus.BAD_REQUEST,
        );
      }

      const response = await this.aiSupportService.generateResponse(
        chatMessageDto.message,
        {
          userId: req.user._id,
          userEmail: req.user.email,
          ...chatMessageDto.context,
        },
      );

      return {
        success: true,
        response,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to process your request',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('suggestions')
  async getSuggestions() {
    try {
      const suggestions = await this.aiSupportService.getChatSuggestions();
      return {
        success: true,
        suggestions,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get suggestions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
