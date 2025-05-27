import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';
import { CreateMessageDto } from './dto/create-message.dto';
import { GetMessagesDto } from './dto/get-messages.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
  ) {}

  async create(senderId: string, createMessageDto: CreateMessageDto): Promise<Message> {
    const newMessage = new this.messageModel({
      senderId,
      receiverId: createMessageDto.receiverId,
      content: createMessageDto.content,
    });
    return newMessage.save();
  }

  async findAll(getMessagesDto: GetMessagesDto): Promise<Message[]> {
    const { userId, otherUserId } = getMessagesDto;
    
    if (otherUserId) {
      // Get conversation between two users
      return this.messageModel
        .find({
          $or: [
            { senderId: userId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: userId },
          ],
        })
        .sort({ createdAt: 1 })
        .exec();
    }
    
    // Get all messages for a user
    return this.messageModel
      .find({
        $or: [{ senderId: userId }, { receiverId: userId }],
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async markAsRead(userId: string, messageId: string): Promise<Message | null> {
    return this.messageModel.findOneAndUpdate(
      { id: messageId, receiverId: userId, read: false },
      { read: true },
      { new: true },
    ).exec();
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.messageModel.countDocuments({
      receiverId: userId,
      read: false,
    }).exec();
  }
}
