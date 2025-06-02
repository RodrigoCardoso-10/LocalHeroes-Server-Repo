import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskStatus } from './schemas/task.schema';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('TasksService - remove method', () => {
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

  describe('remove', () => {
    it('should remove a task', async () => {
      // Create a populated task for the findOne method
      const populatedTask = {
        _id: new Types.ObjectId(mockTaskId),
        postedBy: {
          _id: new Types.ObjectId(mockUserId),
          id: mockUserId,
          toString: () => mockUserId
        }
      };
      
      // Mock the findOne method to return the populated task
      jest.spyOn(service, 'findOne').mockResolvedValue(populatedTask as any);
      
      // Mock the delete operation
      mockTaskModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 })
      });

      const result = await service.remove(mockTaskId, mockUserId);

      expect(service.findOne).toHaveBeenCalledWith(mockTaskId);
      expect(mockTaskModel.deleteOne).toHaveBeenCalledWith({ _id: mockTaskId });
      expect(result).toEqual({ deleted: true });
    });
    
    it('should throw ForbiddenException if user is not the poster', async () => {
      const differentUserId = '6507f6b76a9c6a9c6a9c6a9e';
      
      // Create a populated task for the findOne method
      const populatedTask = {
        _id: new Types.ObjectId(mockTaskId),
        postedBy: {
          _id: new Types.ObjectId(mockUserId),
          id: mockUserId,
          toString: () => mockUserId
        }
      };
      
      // Mock the findOne method to return the populated task
      jest.spyOn(service, 'findOne').mockResolvedValue(populatedTask as any);

      await expect(service.remove(mockTaskId, differentUserId))
        .rejects.toThrow(ForbiddenException);

      expect(service.findOne).toHaveBeenCalledWith(mockTaskId);
      expect(mockTaskModel.deleteOne).not.toHaveBeenCalled();
    });
    
    it('should throw NotFoundException if task not found', async () => {
      // Mock findOne to throw NotFoundException
      jest.spyOn(service, 'findOne').mockImplementation(() => {
        throw new NotFoundException(`Task with ID ${mockTaskId} not found`);
      });

      await expect(service.remove(mockTaskId, mockUserId))
        .rejects.toThrow(NotFoundException);

      expect(service.findOne).toHaveBeenCalledWith(mockTaskId);
      expect(mockTaskModel.deleteOne).not.toHaveBeenCalled();
    });
  });
});
