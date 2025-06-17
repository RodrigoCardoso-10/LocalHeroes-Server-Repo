import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
  NotificationType,
} from './schemas/notification.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
  ) {}

  async create(
    createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    const notification = new this.notificationModel({
      ...createNotificationDto,
      userId: new Types.ObjectId(createNotificationDto.userId),
      taskId: createNotificationDto.taskId
        ? new Types.ObjectId(createNotificationDto.taskId)
        : undefined,
      fromUserId: createNotificationDto.fromUserId
        ? new Types.ObjectId(createNotificationDto.fromUserId)
        : undefined,
    });
    return notification.save();
  }

  async findByUserId(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
  }> {
    const userObjectId = new Types.ObjectId(userId);

    const [notifications, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find({ userId: userObjectId })
        .populate('fromUserId', 'firstName lastName username')
        .populate('taskId', 'title')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .exec(),
      this.notificationModel.countDocuments({ userId: userObjectId }).exec(),
      this.notificationModel
        .countDocuments({
          userId: userObjectId,
          read: false,
        })
        .exec(),
    ]);

    return {
      notifications,
      total,
      unreadCount,
    };
  }
  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<Notification | null> {
    return this.notificationModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(notificationId),
          userId: new Types.ObjectId(userId),
        },
        { read: true },
        { new: true },
      )
      .exec();
  }

  async markAllAsRead(userId: string): Promise<{ modifiedCount: number }> {
    const result = await this.notificationModel
      .updateMany(
        { userId: new Types.ObjectId(userId), read: false },
        { read: true },
      )
      .exec();

    return { modifiedCount: result.modifiedCount };
  }

  async deleteNotification(
    notificationId: string,
    userId: string,
  ): Promise<boolean> {
    const result = await this.notificationModel
      .deleteOne({
        _id: new Types.ObjectId(notificationId),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    return result.deletedCount > 0;
  }

  // Helper methods for creating specific notification types
  async createJobApplicationNotification(
    jobPosterId: string,
    applicantId: string,
    taskId: string,
    taskTitle: string,
    applicantName: string,
  ): Promise<Notification> {
    return this.create({
      userId: jobPosterId,
      type: NotificationType.JOB_APPLICATION,
      title: 'New Job Application',
      message: `${applicantName} has applied for your job "${taskTitle}"`,
      taskId,
      fromUserId: applicantId,
      metadata: {
        applicantName,
        taskTitle,
      },
    });
  }

  async createApplicationStatusNotification(
    applicantId: string,
    jobPosterId: string,
    taskId: string,
    taskTitle: string,
    accepted: boolean,
    jobPosterName: string,
  ): Promise<Notification> {
    const type = accepted
      ? NotificationType.APPLICATION_ACCEPTED
      : NotificationType.APPLICATION_REJECTED;

    const title = accepted ? 'Application Accepted!' : 'Application Update';
    const message = accepted
      ? `Congratulations! ${jobPosterName} has accepted your application for "${taskTitle}"`
      : `Your application for "${taskTitle}" was not selected this time`;

    return this.create({
      userId: applicantId,
      type,
      title,
      message,
      taskId,
      fromUserId: jobPosterId,
      metadata: {
        taskTitle,
        jobPosterName,
        accepted,
      },
    });
  }

  async createJobCompletedNotification(
    userId: string,
    taskId: string,
    taskTitle: string,
    fromUserId: string,
    fromUserName: string,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.JOB_COMPLETED,
      title: 'Job Completed',
      message: `The job "${taskTitle}" has been marked as completed by ${fromUserName}`,
      taskId,
      fromUserId,
      metadata: {
        taskTitle,
        fromUserName,
      },
    });
  }

  async createJobCancelledNotification(
    userId: string,
    taskId: string,
    taskTitle: string,
    fromUserId: string,
    fromUserName: string,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.JOB_CANCELLED,
      title: 'Job Cancelled',
      message: `The job "${taskTitle}" has been cancelled by ${fromUserName}`,
      taskId,
      fromUserId,
      metadata: {
        taskTitle,
        fromUserName,
      },
    });
  }
}
