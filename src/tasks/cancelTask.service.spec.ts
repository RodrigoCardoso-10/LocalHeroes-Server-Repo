import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskStatus } from './schemas/task.schema';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('TasksService - cancelTask method', () => {
  let service: TasksService;
  let taskModel: Model<Task>;

  const mockTaskId = '6507f6b76a9c6a9c6a9c6a9c';
  const mockUserId = '6507f6b76a9c6a9c6a9c6a9d';

  const mockTaskModel = {
    new: jest.fn(),
    constructor: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    deleteOne: jest.fn(),
    exec: jest.fn(),
    populate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getModelToken(Task.name),
          useValue: mockTaskModel,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    taskModel = module.get<Model<Task>>(getModelToken(Task.name));
    
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('cancelTask', () => {
    it('should cancel a task as poster', async () => {
      // Create a populated task for the findOne method
      const populatedTask = {
        _id: new Types.ObjectId(mockTaskId),
        status: TaskStatus.IN_PROGRESS,
        postedBy: {
          _id: new Types.ObjectId(mockUserId),
          id: mockUserId,
          toString: () => mockUserId
        },
        acceptedBy: {
          _id: new Types.ObjectId('6507f6b76a9c6a9c6a9c6a9e'),
          id: '6507f6b76a9c6a9c6a9c6a9e',
          toString: () => '6507f6b76a9c6a9c6a9c6a9e'
        },
        save: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(mockTaskId),
          status: TaskStatus.CANCELLED,
          postedBy: {
            _id: new Types.ObjectId(mockUserId),
            id: mockUserId,
            toString: () => mockUserId
          },
          acceptedBy: {
            _id: new Types.ObjectId('6507f6b76a9c6a9c6a9c6a9e'),
            id: '6507f6b76a9c6a9c6a9c6a9e',
            toString: () => '6507f6b76a9c6a9c6a9c6a9e'
          }
        })
      };
      
      // Mock the findOne method to return the populated task
      jest.spyOn(service, 'findOne').mockResolvedValue(populatedTask as any);
      
      const result = await service.cancelTask(mockTaskId, mockUserId);
      
      expect(service.findOne).toHaveBeenCalledWith(mockTaskId);
      expect(populatedTask.save).toHaveBeenCalled();
      expect(result.status).toEqual(TaskStatus.CANCELLED);
    });
    
    it('should throw ForbiddenException if user is not poster or doer', async () => {
      const differentUserId = '6507f6b76a9c6a9c6a9c6a9f';
      
      // Create a populated task for the findOne method
      const populatedTask = {
        _id: new Types.ObjectId(mockTaskId),
        status: TaskStatus.IN_PROGRESS,
        postedBy: {
          _id: new Types.ObjectId(mockUserId),
          id: mockUserId,
          toString: () => mockUserId
        },
        acceptedBy: {
          _id: new Types.ObjectId('6507f6b76a9c6a9c6a9c6a9e'),
          id: '6507f6b76a9c6a9c6a9c6a9e',
          toString: () => '6507f6b76a9c6a9c6a9c6a9e'
        },
        save: jest.fn()
      };
      
      // Mock the findOne method to return the populated task
      jest.spyOn(service, 'findOne').mockResolvedValue(populatedTask as any);
      
      await expect(service.cancelTask(mockTaskId, differentUserId))
        .rejects.toThrow(ForbiddenException);
      
      expect(service.findOne).toHaveBeenCalledWith(mockTaskId);
      expect(populatedTask.save).not.toHaveBeenCalled();
    });
    
    it('should throw ForbiddenException if task is completed', async () => {
      // Create a populated task with COMPLETED status
      const populatedTask = {
        _id: new Types.ObjectId(mockTaskId),
        status: TaskStatus.COMPLETED, // Already completed
        postedBy: {
          _id: new Types.ObjectId(mockUserId),
          id: mockUserId,
          toString: () => mockUserId
        },
        acceptedBy: null,
        save: jest.fn()
      };
      
      // Mock the findOne method to return the populated task
      jest.spyOn(service, 'findOne').mockResolvedValue(populatedTask as any);
      
      await expect(service.cancelTask(mockTaskId, mockUserId))
        .rejects.toThrow(ForbiddenException);
      
      expect(service.findOne).toHaveBeenCalledWith(mockTaskId);
      expect(populatedTask.save).not.toHaveBeenCalled();
    });
  });
});
