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
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';

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
  constructor(
    @InjectModel(Task.name) private taskModel: Model<Task>,
    private notificationsService: NotificationsService,
    private usersService: UsersService,
  ) {}

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
      }>('postedBy', 'id email firstName lastName')
      .populate<{
        acceptedBy: UserDocument | null;
      }>('acceptedBy', 'id email firstName lastName')
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
      }>('postedBy', 'id email firstName lastName')
      .populate<{
        acceptedBy: UserDocument | null;
      }>('acceptedBy', 'id email firstName lastName')
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
        'id email firstName lastName',
      )
      .populate<{ acceptedBy: UserDocument | null }>(
        'acceptedBy',
        'id email firstName lastName',
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
        'id email firstName lastName',
      )
      .populate<{ acceptedBy: UserDocument | null }>(
        'acceptedBy',
        'id email firstName lastName',
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

    // Get the doer's information to create notification
    const doerObjectId = new Types.ObjectId(doerId);
    const doerUser = await this.taskModel.populate(
      { acceptedBy: doerObjectId },
      { path: 'acceptedBy', select: 'firstName lastName email' },
    );

    task.acceptedBy = doerObjectId as any;
    task.status = TaskStatus.IN_PROGRESS;
    const savedTask = await (task as any).save();

    // Create notification for the job poster that someone applied
    try {
      const doerName = doerUser?.acceptedBy
        ? `${(doerUser.acceptedBy as any).firstName || ''} ${(doerUser.acceptedBy as any).lastName || ''}`.trim() ||
          (doerUser.acceptedBy as any).email
        : 'Someone';

      await this.notificationsService.createJobApplicationNotification(
        task.postedBy._id.toString(),
        doerId,
        taskId,
        task.title,
        doerName,
      );
    } catch (error) {
      console.error('Failed to create job application notification:', error);
    }

    return savedTask;
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
    experienceLevel?: string;
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
      experienceLevel,
      page = 1,
      limit = 10,
    } = filters;

    // Build the query object
    const query: any = {};

    // User-specific filters - handle UUID to ObjectId conversion
    if (postedBy) {
      try {
        // Try to find the user by UUID to get their MongoDB ObjectId
        const user = await this.usersService.findOneById(postedBy);
        query.postedBy = user._id; // Use the MongoDB ObjectId for the query
      } catch (error) {
        // If user not found, return empty results instead of throwing error
        return {
          tasks: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }
    }
    if (acceptedBy) {
      try {
        // Try to find the user by UUID to get their MongoDB ObjectId
        const user = await this.usersService.findOneById(acceptedBy);
        query.acceptedBy = user._id; // Use the MongoDB ObjectId for the query
      } catch (error) {
        // If user not found, return empty results instead of throwing error
        return {
          tasks: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }
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
    } // Tags filter (if we add tags to the schema later)
    if (tags && tags.length > 0) {
      query.tags = { $in: tags };
    }

    // Experience level filter
    if (experienceLevel) {
      query.experienceLevel = { $regex: experienceLevel, $options: 'i' };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query with pagination
    const [tasks, total] = await Promise.all([
      this.taskModel
        .find(query)
        .populate<{
          postedBy: UserDocument;
        }>('postedBy', 'id email firstName lastName')
        .populate<{
          acceptedBy: UserDocument | null;
        }>('acceptedBy', 'id email firstName lastName')
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

  async getFilterCounts(): Promise<{
    categories: Record<string, number>;
    experienceLevels: Record<string, number>;
    datePosted: Record<string, number>;
  }> {
    try {
      // Get category counts using aggregation
      const categoryPipeline = [
        { $match: { status: 'OPEN' } }, // Only count open tasks
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ];

      // Get experience level counts using aggregation
      const experiencePipeline = [
        { $match: { status: 'OPEN' } }, // Only count open tasks
        { $group: { _id: '$experienceLevel', count: { $sum: 1 } } },
      ];

      // Get date-based counts using aggregation
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        categoryResults,
        experienceResults,
        totalCount,
        dailyCount,
        weeklyCount,
        monthlyCount,
      ] = await Promise.all([
        this.taskModel.aggregate(categoryPipeline).exec(),
        this.taskModel.aggregate(experiencePipeline).exec(),
        this.taskModel.countDocuments({ status: 'OPEN' }).exec(),
        this.taskModel
          .countDocuments({ status: 'OPEN', createdAt: { $gte: oneDayAgo } })
          .exec(),
        this.taskModel
          .countDocuments({ status: 'OPEN', createdAt: { $gte: oneWeekAgo } })
          .exec(),
        this.taskModel
          .countDocuments({ status: 'OPEN', createdAt: { $gte: oneMonthAgo } })
          .exec(),
      ]);

      // Process category results
      const categories: Record<string, number> = {};
      categoryResults.forEach((result) => {
        if (result._id) {
          categories[result._id] = result.count;
        }
      });

      // Process experience level results
      const experienceLevels: Record<string, number> = {};
      experienceResults.forEach((result) => {
        if (result._id) {
          experienceLevels[result._id] = result.count;
        }
      });

      // Date posted counts
      const datePosted: Record<string, number> = {
        All: totalCount,
        'Last 24 Hours': dailyCount,
        'Last 7 Days': weeklyCount,
        'Last 30 Days': monthlyCount,
      };

      return {
        categories,
        experienceLevels,
        datePosted,
      };
    } catch (error) {
      console.error('Error getting filter counts:', error);
      return {
        categories: {},
        experienceLevels: {},
        datePosted: {},
      };
    }
  }

  async applyForTask(taskId: string, applicantId: string): Promise<Task> {
    const task = await this.findOne(taskId);

    if (task.status !== TaskStatus.OPEN) {
      throw new ForbiddenException('Task is not open for applications.');
    }
    if (!isPopulatedUser(task.postedBy)) {
      throw new ForbiddenException('Task poster information is missing.');
    }

    // Check if user is trying to apply for their own task
    if (task.postedBy.id === applicantId) {
      throw new ForbiddenException('You cannot apply for your own task.');
    }

    // Check if user has already applied
    const applicantObjectId = new Types.ObjectId(applicantId);
    if (task.applications?.some((id) => id.toString() === applicantId)) {
      throw new ForbiddenException('You have already applied for this task.');
    }

    // Add application
    if (!task.applications) {
      task.applications = [];
    }
    task.applications.push(applicantObjectId);
    const savedTask = await (task as any).save();

    // Get applicant's information for notification
    try {
      const applicantPopulated = await this.taskModel.populate(
        { applications: [applicantObjectId] },
        { path: 'applications', select: 'firstName lastName email' },
      );

      const applicant = applicantPopulated?.applications?.[0] as any;
      const applicantName = applicant
        ? `${applicant.firstName || ''} ${applicant.lastName || ''}`.trim() ||
          applicant.email
        : 'Someone';

      // Create notification for the job poster that someone applied
      await this.notificationsService.createJobApplicationNotification(
        task.postedBy._id.toString(),
        applicantId,
        taskId,
        task.title,
        applicantName,
      );
    } catch (error) {
      console.error('Failed to create job application notification:', error);
    }

    return savedTask;
  }

  async acceptApplicant(
    taskId: string,
    applicantId: string,
    posterId: string,
  ): Promise<Task> {
    const task = await this.findOne(taskId);

    if (task.status !== TaskStatus.OPEN) {
      throw new ForbiddenException('Task is not open for acceptance.');
    }
    if (!isPopulatedUser(task.postedBy)) {
      throw new ForbiddenException('Task poster information is missing.');
    }

    // Check if the user is the task poster
    if (task.postedBy.id !== posterId) {
      throw new ForbiddenException(
        'Only the task poster can accept applicants.',
      );
    }

    // Check if applicant has applied
    if (!task.applications?.some((id) => id.toString() === applicantId)) {
      throw new ForbiddenException('This user has not applied for this task.');
    }

    // Accept the applicant
    task.acceptedBy = new Types.ObjectId(applicantId) as any;
    task.status = TaskStatus.IN_PROGRESS;
    const savedTask = await (task as any).save();

    // Create notification for accepted applicant
    try {
      const posterName =
        `${task.postedBy.firstName || ''} ${task.postedBy.lastName || ''}`.trim() ||
        task.postedBy.email;

      await this.notificationsService.createApplicationStatusNotification(
        applicantId,
        posterId,
        taskId,
        task.title,
        true, // accepted
        posterName,
      );

      // Create notifications for rejected applicants
      const rejectedApplicants =
        task.applications?.filter((id) => id.toString() !== applicantId) || [];
      for (const rejectedId of rejectedApplicants) {
        await this.notificationsService.createApplicationStatusNotification(
          rejectedId.toString(),
          posterId,
          taskId,
          task.title,
          false, // rejected
          posterName,
        );
      }
    } catch (error) {
      console.error(
        'Failed to create application status notifications:',
        error,
      );
    }

    return savedTask;
  }
}
