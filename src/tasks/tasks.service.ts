import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskStatus, PopulatedTask } from './schemas/task.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UserDocument } from '../users/schemas/user.schema';

// Updated type guard with proper typing
function isPopulatedUser(
  userField: any,
): userField is UserDocument & { _id: Types.ObjectId } {
  return (
    userField &&
    typeof userField === 'object' &&
    '_id' in userField &&
    (userField._id instanceof Types.ObjectId ||
      Types.ObjectId.isValid(userField._id))
  );
}

@Injectable()
export class TasksService {
  constructor(@InjectModel(Task.name) private taskModel: Model<Task>) {}

  async create(
    createTaskDto: CreateTaskDto,
    postedByUser: UserDocument, // Use UserDocument
  ): Promise<Task> {
    const createdTask = new this.taskModel({
      ...createTaskDto,
      postedBy: postedByUser._id, // Access _id from UserDocument
      status: TaskStatus.OPEN,
    });
    return createdTask.save();
  }

  async findAll(): Promise<PopulatedTask[]> {
    const tasks = await this.taskModel
      .find()
      .populate<{
        postedBy: UserDocument;
      }>('postedBy', 'id username email firstName lastName')
      .populate<{
        acceptedBy: UserDocument | null;
      }>('acceptedBy', 'id username email firstName lastName')
      .exec();
    return tasks as PopulatedTask[];
  }

  async findOne(id: string): Promise<PopulatedTask> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid task ID format');
    }
    const task = await this.taskModel
      .findById(id)
      .populate<{
        postedBy: UserDocument;
      }>('postedBy', 'id username email firstName lastName')
      .populate<{
        acceptedBy: UserDocument | null;
      }>('acceptedBy', 'id username email firstName lastName')
      .exec();
    if (!task) {
      throw new NotFoundException(`Task with ID "${id}" not found`);
    }
    return task as PopulatedTask;
  }
  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
    userId: string,
  ): Promise<Task> {
    const task = await this.findOne(id);

    if (!isPopulatedUser(task.postedBy)) {
      throw new ForbiddenException('Task poster information is missing.');
    }

    // Compare with task.postedBy.id (string uuid) instead of _id.toString()
    if (task.postedBy.id !== userId) {
      throw new ForbiddenException(
        'You are not authorized to update this task.',
      );
    }

    if (
      task.status === TaskStatus.COMPLETED ||
      task.status === TaskStatus.CANCELLED
    ) {
      throw new ForbiddenException(
        `Task cannot be updated as it is already ${task.status}.`,
      );
    }

    const updatableDto = { ...updateTaskDto };
    delete (updatableDto as any).postedBy; // Ensure postedBy is not in the update object

    Object.assign(task, updatableDto);
    return (task as any).save();
  }
  async remove(
    id: string,
    userId: string,
  ): Promise<{ deleted: boolean; message?: string }> {
    const task = await this.findOne(id);

    if (!isPopulatedUser(task.postedBy)) {
      throw new ForbiddenException('Task poster information is missing.');
    }

    // Compare with task.postedBy.id (string uuid) instead of _id.toString()
    if (task.postedBy.id !== userId) {
      throw new ForbiddenException(
        'You are not authorized to delete this task.',
      );
    }

    await this.taskModel.deleteOne({ _id: id }).exec();
    return { deleted: true };
  }

  async findAllByPoster(posterId: string): Promise<PopulatedTask[]> {
    if (!Types.ObjectId.isValid(posterId)) {
      throw new NotFoundException('Invalid user ID format for poster.');
    }
    const tasks = await this.taskModel
      .find({ postedBy: posterId as any })
      .populate<{ postedBy: UserDocument }>(
        'postedBy',
        'id username email firstName lastName',
      )
      .populate<{ acceptedBy: UserDocument | null }>(
        'acceptedBy',
        'id username email firstName lastName',
      )
      .exec();
    return tasks as PopulatedTask[];
  }

  async findAllByDoer(doerId: string): Promise<PopulatedTask[]> {
    if (!Types.ObjectId.isValid(doerId)) {
      throw new NotFoundException('Invalid user ID format for doer.');
    }
    const tasks = await this.taskModel
      .find({ acceptedBy: doerId as any })
      .populate<{ postedBy: UserDocument }>(
        'postedBy',
        'id username email firstName lastName',
      )
      .populate<{ acceptedBy: UserDocument | null }>(
        'acceptedBy',
        'id username email firstName lastName',
      )
      .exec();
    return tasks as PopulatedTask[];
  }
  async acceptTask(taskId: string, doerId: string): Promise<Task> {
    const task = await this.findOne(taskId);

    if (task.status !== TaskStatus.OPEN) {
      throw new ForbiddenException('Task is not open for acceptance.');
    }
    if (!isPopulatedUser(task.postedBy)) {
      throw new ForbiddenException('Task poster information is missing.');
    }

    // Compare with task.postedBy.id (string uuid) instead of _id.toString()
    if (task.postedBy.id === doerId) {
      throw new ForbiddenException('You cannot accept your own task.');
    }
    task.acceptedBy = new Types.ObjectId(doerId) as any;
    task.status = TaskStatus.IN_PROGRESS;
    return (task as any).save();
  }

  async completeTask(taskId: string, userId: string): Promise<Task> {
    const task = await this.findOne(taskId);

    // Use type assertions after checking if it's populated
    let isPoster = false;
    if (isPopulatedUser(task.postedBy)) {
      isPoster = task.postedBy.id === userId;
    }

    // Separate null check and type assertion
    let isDoer = false;
    if (task.acceptedBy && isPopulatedUser(task.acceptedBy)) {
      isDoer = task.acceptedBy.id === userId;
    }

    if (!isPoster && !isDoer) {
      throw new ForbiddenException(
        'You are not authorized to mark this task as completed.',
      );
    }
    if (task.status !== TaskStatus.IN_PROGRESS) {
      throw new ForbiddenException(
        'Task must be IN_PROGRESS to be marked as completed.',
      );
    }
    task.status = TaskStatus.COMPLETED;
    return (task as any).save();
  }

  async cancelTask(taskId: string, userId: string): Promise<Task> {
    const task = await this.findOne(taskId);

    // Use type assertions after checking if it's populated
    let isPoster = false;
    if (isPopulatedUser(task.postedBy)) {
      isPoster = task.postedBy.id === userId;
    }

    // Separate null check and type assertion
    let isDoer = false;
    if (task.acceptedBy && isPopulatedUser(task.acceptedBy)) {
      isDoer = task.acceptedBy.id === userId;
    }

    if (!isPoster && !isDoer) {
      throw new ForbiddenException(
        'You are not authorized to cancel this task.',
      );
    }
    if (task.status === TaskStatus.COMPLETED) {
      throw new ForbiddenException('Cannot cancel a completed task.');
    }
    task.status = TaskStatus.CANCELLED;

    // Safe check before accessing properties
    if (
      task.acceptedBy &&
      isPopulatedUser(task.acceptedBy) &&
      task.acceptedBy.id === userId
    ) {
      task.acceptedBy = undefined;
    }
    return (task as any).save();
  }

  async findAllWithFilters(filters: {
    postedBy?: string;
    acceptedBy?: string;
    search?: string;
    location?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    status?: string;
    datePosted?: string;
    tags?: string[];
    page?: number;
    limit?: number;
  }): Promise<{
    tasks: PopulatedTask[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      postedBy,
      acceptedBy,
      search,
      location,
      category,
      minPrice,
      maxPrice,
      status,
      datePosted,
      tags,
      page = 1,
      limit = 10,
    } = filters;

    // Build the query object
    const query: any = {};

    // User-specific filters
    if (postedBy) {
      query.postedBy = postedBy;
    }
    if (acceptedBy) {
      query.acceptedBy = acceptedBy;
    }

    // Text search in title and description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Location filter
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    // Category filter
    if (category) {
      query.category = { $regex: category, $options: 'i' };
    }

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined) {
        query.price.$gte = minPrice;
      }
      if (maxPrice !== undefined) {
        query.price.$lte = maxPrice;
      }
    }

    // Status filter
    if (status && Object.values(TaskStatus).includes(status as TaskStatus)) {
      query.status = status;
    } // Date posted filter
    if (datePosted) {
      const now = new Date();
      let dateFilter: Date | null;

      switch (datePosted) {
        case 'Last Hour':
          dateFilter = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case 'Last 24 Hours':
          dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'Last 7 Days':
          dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'Last 30 Days':
          dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateFilter = null;
      }

      if (dateFilter) {
        query.createdAt = { $gte: dateFilter };
      }
    }

    // Tags filter (if we add tags to the schema later)
    if (tags && tags.length > 0) {
      query.tags = { $in: tags };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query with pagination
    const [tasks, total] = await Promise.all([
      this.taskModel
        .find(query)
        .populate<{
          postedBy: UserDocument;
        }>('postedBy', 'id username email firstName lastName')
        .populate<{
          acceptedBy: UserDocument | null;
        }>('acceptedBy', 'id username email firstName lastName')
        .sort({ createdAt: -1 }) // Sort by newest first
        .skip(skip)
        .limit(limit)
        .exec(),
      this.taskModel.countDocuments(query).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      tasks: tasks as PopulatedTask[],
      total,
      page,
      limit,
      totalPages,
    };
  }
}
