import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthFastifyRequest } from '../auth/interfaces/auth-fastify-request.interface';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findUserNotifications(
    @Req() req: AuthFastifyRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit) : 50;
    const offsetNum = offset ? parseInt(offset) : 0;

    return this.notificationsService.findByUserId(
      req.user._id.toString(),
      limitNum,
      offsetNum,
    );
  }

  @Patch(':id/read')
  async markAsRead(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: AuthFastifyRequest,
  ) {
    return this.notificationsService.markAsRead(id, req.user._id.toString());
  }

  @Patch('mark-all-read')
  async markAllAsRead(@Req() req: AuthFastifyRequest) {
    return this.notificationsService.markAllAsRead(req.user._id.toString());
  }

  @Delete(':id')
  async deleteNotification(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: AuthFastifyRequest,
  ) {
    const deleted = await this.notificationsService.deleteNotification(
      id,
      req.user._id.toString(),
    );
    return { deleted };
  }
}
