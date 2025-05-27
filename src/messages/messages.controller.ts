import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { GetMessagesDto } from './dto/get-messages.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  create(@Request() req, @Body() createMessageDto: CreateMessageDto) {
    return this.messagesService.create(req.user.id, createMessageDto);
  }

  @Get()
  findAll(@Request() req, @Body() getMessagesDto: GetMessagesDto) {
    // Override userId with authenticated user's ID for security
    getMessagesDto.userId = req.user.id;
    return this.messagesService.findAll(getMessagesDto);
  }

  @Get('conversation/:otherUserId')
  getConversation(@Request() req, @Param('otherUserId') otherUserId: string) {
    const getMessagesDto: GetMessagesDto = {
      userId: req.user.id,
      otherUserId,
    };
    return this.messagesService.findAll(getMessagesDto);
  }

  @Post(':messageId/read')
  markAsRead(@Request() req, @Param('messageId') messageId: string) {
    return this.messagesService.markAsRead(req.user.id, messageId);
  }

  @Get('unread/count')
  getUnreadCount(@Request() req) {
    return this.messagesService.getUnreadCount(req.user.id);
  }
}
