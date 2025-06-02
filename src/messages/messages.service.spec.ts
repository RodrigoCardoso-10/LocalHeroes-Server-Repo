import { Test, TestingModule } from '@nestjs/testing';
import { MessagesService } from './messages.service';
import { getModelToken } from '@nestjs/mongoose';
import { Message } from './schemas/message.schema';
import { CreateMessageDto } from './dto/create-message.dto';
import { GetMessagesDto } from './dto/get-messages.dto';
import { Model } from 'mongoose';

describe('MessagesService', () => {
  let service: MessagesService;
  let messageModel: Model<Message>;

  const mockMessage = {
    id: 'test-message-id',
    senderId: 'sender-id',
    receiverId: 'receiver-id',
    content: 'Hello, this is a test message',
    read: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(this),
  };

  // Create a constructor function for the messageModel
  const mockMessageModel = function() {
    return {
      ...mockMessage,
      save: jest.fn().mockResolvedValue(mockMessage)
    };
  };
  
  // Add methods to the mockMessageModel
  mockMessageModel.find = jest.fn();
  mockMessageModel.findOneAndUpdate = jest.fn();
  mockMessageModel.countDocuments = jest.fn();
  mockMessageModel.save = jest.fn();
  mockMessageModel.exec = jest.fn();
  mockMessageModel.sort = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: getModelToken(Message.name),
          useValue: mockMessageModel,
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
    messageModel = module.get<Model<Message>>(getModelToken(Message.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new message', async () => {
      const createMessageDto: CreateMessageDto = {
        receiverId: 'receiver-id',
        content: 'Hello, this is a test message',
      };

      const senderId = 'sender-id';

      // Setup the mock message model constructor to return a message with save method
      (messageModel as any).new = jest.fn().mockImplementation(() => {
        return {
          ...createMessageDto,
          senderId,
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          save: jest.fn().mockResolvedValue(mockMessage)
        };
      });

      const result = await service.create(senderId, createMessageDto);

      expect(result).toEqual(mockMessage);
    });
  });

  describe('findAll', () => {
    it('should return messages between two users when otherUserId is provided', async () => {
      const getMessagesDto: GetMessagesDto = {
        userId: 'user-id',
        otherUserId: 'other-user-id',
      };

      const mockMessages = [mockMessage];
      
      mockMessageModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockMessages),
        }),
      });

      const result = await service.findAll(getMessagesDto);

      expect(result).toEqual(mockMessages);
      expect(mockMessageModel.find).toHaveBeenCalledWith({
        $or: [
          { senderId: getMessagesDto.userId, receiverId: getMessagesDto.otherUserId },
          { senderId: getMessagesDto.otherUserId, receiverId: getMessagesDto.userId },
        ],
      });
    });

    it('should return all messages for a user when otherUserId is not provided', async () => {
      const getMessagesDto: GetMessagesDto = {
        userId: 'user-id',
      };

      const mockMessages = [mockMessage];
      
      mockMessageModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockMessages),
        }),
      });

      const result = await service.findAll(getMessagesDto);

      expect(result).toEqual(mockMessages);
      expect(mockMessageModel.find).toHaveBeenCalledWith({
        $or: [
          { senderId: getMessagesDto.userId },
          { receiverId: getMessagesDto.userId },
        ],
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark a message as read', async () => {
      const userId = 'user-id';
      const messageId = 'message-id';
      const updatedMessage = { ...mockMessage, read: true };

      mockMessageModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedMessage),
      });

      const result = await service.markAsRead(userId, messageId);

      expect(result).toEqual(updatedMessage);
      expect(mockMessageModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: messageId, receiverId: userId, read: false },
        { read: true },
        { new: true },
      );
    });

    it('should return null if message not found', async () => {
      const userId = 'user-id';
      const messageId = 'non-existent-message-id';

      mockMessageModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.markAsRead(userId, messageId);

      expect(result).toBeNull();
    });
  });

  describe('getUnreadCount', () => {
    it('should return the count of unread messages for a user', async () => {
      const userId = 'user-id';
      const unreadCount = 5;

      mockMessageModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(unreadCount),
      });

      const result = await service.getUnreadCount(userId);

      expect(result).toBe(unreadCount);
      expect(mockMessageModel.countDocuments).toHaveBeenCalledWith({
        receiverId: userId,
        read: false,
      });
    });
  });
});
