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
import { NotificationType } from '../notifications/schemas/notification.schema';
import { UsersService } from '../users/users.service';
import { GeocodingService } from '../common/geocoding/geocoding.service';

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
    private geocodingService: GeocodingService,
  ) {}

  async create(
    createTaskDto: CreateTaskDto,
    postedByUser: UserDocument, // Use UserDocument
  ): Promise<Task> {
    const { location, ...restOfDto } = createTaskDto;
    let locationData: any = {};

    if (location && location.address) {
      const coords = await this.geocodingService.geocode(location.address);
      if (coords) {
        locationData = {
          address: location.address,
          point: {
            type: 'Point',
            coordinates: [coords.longitude, coords.latitude],
          },
        };
      } else {
        locationData = { address: location.address };
      }
    }

    const createdTask = new this.taskModel({
      ...restOfDto,
      location: locationData,
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
      }>('postedBy', '_id id email firstName lastName')
      .populate<{
        acceptedBy: UserDocument | null;
      }>('acceptedBy', '_id id email firstName lastName')
      .exec();
    return tasks as PopulatedTask[];
  }

  async findOne(id: string): Promise<PopulatedTask> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid task ID format');
    }
    const task = await this.taskModel
      .findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true })
      .populate<{
        postedBy: UserDocument;
      }>('postedBy', '_id id email firstName lastName')
      .populate<{
        acceptedBy: UserDocument | null;
      }>('acceptedBy', '_id id email firstName lastName')
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
    const { location, ...restOfDto } = updateTaskDto;

    if (!isPopulatedUser(task.postedBy)) {
      throw new ForbiddenException('Task poster information is missing.');
    }

    // Compare with task.postedBy._id (MongoDB ObjectId as string)
    if (task.postedBy._id.toString() !== userId) {
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

    Object.assign(task, restOfDto);

    if (location && location.address) {
      const coords = await this.geocodingService.geocode(location.address);
      if (coords) {
        task.location = {
          address: location.address,
          point: {
            type: 'Point',
            coordinates: [coords.longitude, coords.latitude],
          },
        };
      } else {
        task.location = { address: location.address };
      }
    } else if (location) {
      task.location = location as any;
    }

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

    // Compare with task.postedBy._id (MongoDB ObjectId as string)
    if (task.postedBy._id.toString() !== userId) {
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
        '_id id email firstName lastName',
      )
      .populate<{ acceptedBy: UserDocument | null }>(
        'acceptedBy',
        '_id id email firstName lastName',
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
        '_id id email firstName lastName',
      )
      .populate<{ acceptedBy: UserDocument | null }>(
        'acceptedBy',
        '_id id email firstName lastName',
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

    // Compare with task.postedBy._id (MongoDB ObjectId as string)
    if (task.postedBy._id.toString() === doerId) {
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

    // Remove doer from applicants list
    const doerIndex = task.applicants.findIndex((id) =>
      id.equals(doerObjectId),
    );
    if (doerIndex > -1) {
      task.applicants.splice(doerIndex, 1);
    }

    const savedTask = await (task as any).save();

    // Create notification for the job poster that someone applied
    try {
      const doerName =
        (doerUser?.acceptedBy
          ? `${(doerUser.acceptedBy as any).firstName || ''} ${(doerUser.acceptedBy as any).lastName || ''}`.trim()
          : '') || 'Someone';

      await this.notificationsService.createJobApplicationNotification(
        task.postedBy._id.toString(),
        doerObjectId.toString(),
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

    // Only the employer (job poster) can mark a task as completed
    if (!isPopulatedUser(task.postedBy)) {
      throw new ForbiddenException('Task poster information is missing.');
    }

    if (task.postedBy.id !== userId) {
      throw new ForbiddenException(
        'Only the job poster can mark this task as completed.',
      );
    }

    if (task.status !== TaskStatus.IN_PROGRESS) {
      throw new ForbiddenException(
        'Task must be IN_PROGRESS to be marked as completed.',
      );
    }

    if (!task.acceptedBy) {
      throw new ForbiddenException(
        'Cannot complete task - no employee has been assigned.',
      );
    }

    if (!isPopulatedUser(task.acceptedBy)) {
      throw new ForbiddenException('Employee information is missing.');
    }

    // Get full user documents for balance transfer
    const employer = await this.usersService.findOneById(
      task.postedBy._id.toString(),
    );
    const employee = await this.usersService.findOneById(
      task.acceptedBy._id.toString(),
    );

    // Check if employer has sufficient balance
    if (employer.balance < task.price) {
      throw new ForbiddenException(
        `Insufficient balance. You need $${task.price} but only have $${employer.balance}.`,
      );
    }

    // Transfer funds from employer to employee
    employer.balance -= task.price;
    employee.balance += task.price;

    // Save updated balances
    await employer.save();
    await employee.save();

    // Mark task as completed and paid
    task.status = TaskStatus.PAID; // Send notification to employee
    await this.notificationsService.create({
      userId: (employee._id as Types.ObjectId).toString(),
      title: 'Job Completed',
      message: `Job "${task.title}" has been completed and you received $${task.price}!`,
      type: NotificationType.JOB_COMPLETED,
      taskId: taskId,
    });

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
    sortBy?: string;
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
      sortBy,
    } = filters;

    // Build the query object
    const query: any = {}; // User-specific filters - directly use MongoDB ObjectId
    if (postedBy) {
      console.log('Using postedBy filter with MongoDB ObjectId:', postedBy);
      query.postedBy = postedBy; // Use the MongoDB ObjectId directly
    }
    if (acceptedBy) {
      console.log('Using acceptedBy filter with MongoDB ObjectId:', acceptedBy);
      query.acceptedBy = acceptedBy; // Use the MongoDB ObjectId directly
    }

    // Text search in title and description
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    // Location filter
    if (location) {
      query['location.address'] = { $regex: location, $options: 'i' };
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
    }

    // Date posted filter
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

    // Experience level filter
    if (experienceLevel) {
      query.experienceLevel = { $regex: experienceLevel, $options: 'i' };
    }

    const sort: any = {};
    if (sortBy) {
      switch (sortBy) {
        case 'price-asc':
          sort.price = 1;
          break;
        case 'price-desc':
          sort.price = -1;
          break;
        case 'latest':
        default:
          sort.createdAt = -1;
          break;
      }
    } else {
      sort.createdAt = -1;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query with pagination
    const [tasks, total] = await Promise.all([
      this.taskModel
        .find(query)
        .populate<{
          postedBy: UserDocument;
        }>('postedBy', '_id id email firstName lastName')
        .populate<{
          acceptedBy: UserDocument | null;
        }>('acceptedBy', '_id id email firstName lastName')
        .sort(sort)
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
    const applicantUser = await this.usersService.findOneById(applicantId);
    if (!applicantUser) {
      throw new NotFoundException(
        `Applicant with ID "${applicantId}" not found.`,
      );
    }
    const applicantObjectId = applicantUser._id as Types.ObjectId;

    const updatedTask = await this.taskModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(taskId),
          status: TaskStatus.OPEN,
          postedBy: { $ne: applicantObjectId },
          applicants: { $ne: applicantObjectId },
        },
        {
          $addToSet: { applicants: applicantObjectId },
        },
        { new: true },
      )
      .populate<{ postedBy: UserDocument; acceptedBy: UserDocument | null }>([
        { path: 'postedBy', select: '_id id email firstName lastName' },
        { path: 'acceptedBy', select: '_id id email firstName lastName' },
      ]);

    if (!updatedTask) {
      // To provide a specific error, we check the conditions again.
      const task = await this.taskModel.findById(taskId);
      if (!task) {
        throw new NotFoundException(`Task with ID "${taskId}" not found.`);
      }
      if (task.status !== TaskStatus.OPEN) {
        throw new ForbiddenException('Task is not open for applications.');
      }
      if (task.postedBy.toString() === applicantObjectId.toString()) {
        throw new ForbiddenException('You cannot apply for your own task.');
      }
      if (
        task.applicants.some(
          (id) => id.toString() === applicantObjectId.toString(),
        )
      ) {
        throw new ForbiddenException('You have already applied for this task.');
      }
      // If no specific condition failed, it's a generic error.
      throw new ForbiddenException(
        'Could not apply for the task. It may have been updated or is no longer available.',
      );
    }

    // Notification logic
    const applicantName =
      `${applicantUser.firstName} ${applicantUser.lastName}`.trim() ||
      applicantUser.email;

    if (!isPopulatedUser(updatedTask.postedBy)) {
      // This should not happen if population works correctly.
      throw new ForbiddenException('Task poster information is missing.');
    }

    await this.notificationsService.createJobApplicationNotification(
      updatedTask.postedBy._id.toString(),
      applicantObjectId.toString(),
      taskId,
      updatedTask.title,
      applicantName,
    );

    return updatedTask;
  }

  async getTaskWithApplicantDetails(
    taskId: string,
    userId: string,
  ): Promise<any> {
    const task = await this.taskModel
      .findById(taskId)
      .populate<{ postedBy: UserDocument }>('postedBy', 'id')
      .exec();

    if (!task) {
      throw new NotFoundException(`Task with ID "${taskId}" not found`);
    }

    // Check if postedBy is populated and is a valid user document
    if (!isPopulatedUser(task.postedBy)) {
      throw new ForbiddenException('Task poster information is not available.');
    } // Now compare the ObjectId from the populated poster with the userId from the token
    if (task.postedBy._id.toString() !== userId) {
      throw new ForbiddenException(
        'You do not have permission to view applicants for this task.',
      );
    }

    // Re-populate with all the details needed for the frontend
    return task.populate([
      { path: 'postedBy', select: '_id id firstName lastName email' },
      { path: 'applicants', select: '_id id firstName lastName email' },
    ]);
  }

  async acceptApplicant(
    taskId: string,
    applicantId: string,
    posterId: string,
  ): Promise<Task> {
    const task = await this.taskModel
      .findById(taskId)
      .populate<{ postedBy: UserDocument }>('postedBy')
      .exec();

    if (!task) {
      throw new NotFoundException(`Task with ID "${taskId}" not found`);
    }

    if (!isPopulatedUser(task.postedBy)) {
      throw new ForbiddenException('Task poster information is missing.');
    }

    if (task.postedBy.id !== posterId) {
      throw new ForbiddenException(
        'You are not authorized to accept applicants for this task.',
      );
    }

    if (task.status !== TaskStatus.OPEN) {
      throw new ForbiddenException('This task is not open for new applicants.');
    }

    const applicantObjectId = Types.ObjectId.isValid(applicantId)
      ? new Types.ObjectId(applicantId)
      : ((await this.usersService.findOneById(applicantId))
          ._id as Types.ObjectId);

    const applicantExists = task.applicants.some((id) =>
      id.equals(applicantObjectId),
    );

    if (!applicantExists) {
      throw new NotFoundException(
        `Applicant with ID "${applicantId}" not found for this task.`,
      );
    }

    const otherApplicants = task.applicants.filter(
      (id) => !id.equals(applicantObjectId),
    );

    task.acceptedBy = applicantObjectId;
    task.status = TaskStatus.IN_PROGRESS;
    task.applicants = []; // Clear the list of applicants

    await task.save();

    const posterName =
      `${task.postedBy.firstName || ''} ${task.postedBy.lastName || ''}`.trim();

    // Notify accepted applicant
    try {
      await this.notificationsService.createApplicationStatusNotification(
        applicantObjectId.toString(),
        task.postedBy._id.toString(),
        taskId,
        task.title,
        true, // Accepted
        posterName,
      );
    } catch (error) {
      console.error('Failed to send acceptance notification:', error);
    }

    // Notify rejected applicants
    for (const rejectedId of otherApplicants) {
      try {
        await this.notificationsService.createApplicationStatusNotification(
          rejectedId.toString(),
          task.postedBy._id.toString(),
          taskId,
          task.title,
          false, // Rejected
          posterName,
        );
      } catch (error) {
        console.error('Failed to send rejection notification:', error);
      }
    }

    return this.findOne(taskId);
  }

  async denyApplicant(
    taskId: string,
    applicantId: string,
    posterId: string,
  ): Promise<Task> {
    const task = await this.taskModel
      .findById(taskId)
      .populate<{ postedBy: UserDocument }>('postedBy')
      .exec();

    if (!task) {
      throw new NotFoundException(`Task with ID "${taskId}" not found`);
    }

    if (!isPopulatedUser(task.postedBy)) {
      throw new ForbiddenException('Task poster information is missing.');
    }

    if (task.postedBy.id !== posterId) {
      throw new ForbiddenException(
        'You are not authorized to deny applicants for this task.',
      );
    }

    const applicantObjectId = Types.ObjectId.isValid(applicantId)
      ? new Types.ObjectId(applicantId)
      : ((await this.usersService.findOneById(applicantId))
          ._id as Types.ObjectId);

    const initialCount = task.applicants.length;
    task.applicants = task.applicants.filter(
      (id) => !id.equals(applicantObjectId),
    );

    if (task.applicants.length === initialCount) {
      throw new NotFoundException(
        `Applicant with ID "${applicantId}" not found for this task.`,
      );
    }

    await task.save();

    const posterName =
      `${task.postedBy.firstName || ''} ${task.postedBy.lastName || ''}`.trim();

    try {
      await this.notificationsService.createApplicationStatusNotification(
        applicantObjectId.toString(),
        task.postedBy._id.toString(),
        taskId,
        task.title,
        false, // Rejected
        posterName,
      );
    } catch (error) {
      console.error('Failed to send rejection notification:', error);
    }

    return this.findOne(taskId);
  }
  // Note: confirmCompletion is deprecated - payment now happens automatically in completeTask
  async confirmCompletion(taskId: string, posterId: string): Promise<Task> {
    throw new ForbiddenException(
      'This endpoint is deprecated. Tasks are automatically paid when marked as completed.',
    );
  }
}
