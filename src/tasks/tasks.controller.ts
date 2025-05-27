import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthFastifyRequest } from '../auth/interfaces/auth-fastify-request.interface';
import { Task } from './schemas/task.schema';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(
    @Body() createTaskDto: CreateTaskDto,
    @Req() req: AuthFastifyRequest,
  ): Promise<Task> {
    return this.tasksService.create(createTaskDto, req.user);
  }

  @Get()
  findAll(
    @Query('postedBy') postedBy?: string,
    @Query('acceptedBy') acceptedBy?: string,
  ) {
    if (postedBy) {
      return this.tasksService.findAllByPoster(postedBy);
    }
    if (acceptedBy) {
      return this.tasksService.findAllByDoer(acceptedBy);
    }
    return this.tasksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: string): Promise<Task> {
    return this.tasksService.findOne(id);
  }
  @Patch(':id')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Req() req: AuthFastifyRequest,
  ): Promise<Task> {
    // Use req.user.id (string uuid) instead of _id (ObjectId)
    return this.tasksService.update(id, updateTaskDto, req.user.id);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: AuthFastifyRequest,
  ): Promise<{ deleted: boolean; message?: string }> {
    // Use req.user.id (string uuid) instead of _id (ObjectId)
    return this.tasksService.remove(id, req.user.id);
  }

  @Patch(':id/accept')
  acceptTask(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: AuthFastifyRequest,
  ): Promise<Task> {
    // Use req.user.id (string uuid) instead of _id (ObjectId)
    return this.tasksService.acceptTask(id, req.user.id);
  }

  @Patch(':id/complete')
  completeTask(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: AuthFastifyRequest,
  ): Promise<Task> {
    // Use req.user.id (string uuid) instead of _id (ObjectId)
    return this.tasksService.completeTask(id, req.user.id);
  }

  @Patch(':id/cancel')
  cancelTask(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: AuthFastifyRequest,
  ): Promise<Task> {
    // Use req.user.id (string uuid) instead of _id (ObjectId)
    return this.tasksService.cancelTask(id, req.user.id);
  }
}
