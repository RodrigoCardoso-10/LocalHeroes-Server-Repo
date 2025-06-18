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

  @Get('filter-counts')
  getFilterCounts() {
    return this.tasksService.getFilterCounts();
  }

  @Get()
  findAll(
    @Query('postedBy') postedBy?: string,
    @Query('acceptedBy') acceptedBy?: string,
    @Query('search') search?: string,
    @Query('location') location?: string,
    @Query('category') category?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('status') status?: string,
    @Query('datePosted') datePosted?: string,
    @Query('tags') tags?: string,
    @Query('experienceLevel') experienceLevel?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    const filters = {
      postedBy,
      acceptedBy,
      search,
      location,
      category,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      status,
      datePosted,
      tags: tags ? tags.split(',') : undefined,
      experienceLevel,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      sortBy,
    };
    return this.tasksService.findAllWithFilters(filters);
  }

  @Get(':id/with-applicants')
  getTaskWithApplicantDetails(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: AuthFastifyRequest,
  ) {
    return this.tasksService.getTaskWithApplicantDetails(id, req.user.id);
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
  @Patch(':id/apply')
  applyForTask(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: AuthFastifyRequest,
  ): Promise<Task> {
    return this.tasksService.applyForTask(id, req.user.id);
  }

  @Patch(':id/accept-applicant')
  acceptApplicant(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body('applicantId') applicantId: string,
    @Req() req: AuthFastifyRequest,
  ): Promise<Task> {
    return this.tasksService.acceptApplicant(id, applicantId, req.user.id);
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
