import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskStatus } from './schemas/task.schema';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('TasksService - findAll methods', () => {
  let service: TasksService;
  let taskModel: Model<Task>;

  const mockTaskId = '6507f6b76a9c6a9c6a9c6a9c';
  const mockUserId = '6507f6b76a9c6a9c6a9c6a9d';

  const mockTasks = [
    {
      _id: new Types.ObjectId(mockTaskId),
      title: 'Test Task',
      description: 'Test Description',
      price: 100,
      status: TaskStatus.OPEN,
      postedBy: {
        _id: new Types.ObjectId(mockUserId),
        id: mockUserId,
        toString: () => mockUserId
      },
      acceptedBy: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  // Create a proper mock for the Mongoose chain methods
  const mockTaskModel = {
    find: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockTasks)
        })
      })
    }),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    deleteOne: jest.fn(),
    exec: jest.fn(),
    populate: jest.fn()
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

  describe('findAll', () => {
    it('should find all tasks', async () => {
      const result = await service.findAll();
      
      expect(mockTaskModel.find).toHaveBeenCalled();
      // Check that the result matches our mock tasks
      expect(result).toEqual(mockTasks);
    });
  });

  describe('findAllByPoster', () => {
    it('should find all tasks by poster', async () => {
      const result = await service.findAllByPoster(mockUserId);
      
      expect(mockTaskModel.find).toHaveBeenCalledWith({ postedBy: mockUserId });
      // Check that the result matches our mock tasks
      expect(result).toEqual(mockTasks);
    });
  });

  describe('findAllByDoer', () => {
    it('should find all tasks by doer', async () => {
      const result = await service.findAllByDoer(mockUserId);
      
      expect(mockTaskModel.find).toHaveBeenCalledWith({ acceptedBy: mockUserId });
      // Check that the result matches our mock tasks
      expect(result).toEqual(mockTasks);
    });
  });
});
