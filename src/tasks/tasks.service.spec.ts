import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types, Query, Document } from 'mongoose';
import { Task, TaskStatus } from './schemas/task.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserDocument } from '../users/schemas/user.schema';

type MockType<T> = {
  [P in keyof T]?: jest.Mock<{}> | any;
};

describe('TasksService', () => {
  let service: TasksService;
  let taskModel: MockType<Model<Task>>;

  const mockTaskId = '5f9d5c7b9d3f2c1d4c8b4b1a';
  const mockUserId = '5f9d5c7b9d3f2c1d4c8b4b1b';
  const mockDoerId = '5f9d5c7b9d3f2c1d4c8b4b1c';

  const mockTask = {
    _id: new Types.ObjectId(mockTaskId),
    title: 'Test Task',
    description: 'Test Description',
    price: 100,
    postedBy: new Types.ObjectId(mockUserId),
    status: TaskStatus.OPEN,
  };

  const createTaskDto: CreateTaskDto = {
    title: 'Test Task',
    description: 'Test Description',
    price: 100,
  };

  const updateTaskDto: UpdateTaskDto = {
    title: 'Updated Task',
    description: 'Updated Description',
  };

  // Create a factory function for the model constructor
  const mockModelFactory = jest.fn().mockImplementation((dto) => ({
    ...dto,
    _id: new Types.ObjectId(mockTaskId),
    save: jest.fn().mockResolvedValue({
      ...dto,
      _id: new Types.ObjectId(mockTaskId),
    }),
  }));

  // Create a mock for the Task model
  const mockTaskModel = {
    new: mockModelFactory,
    constructor: mockModelFactory,
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    deleteOne: jest.fn(),
  } as unknown as MockType<Model<Task>>;

  // Setup chainable query methods
  const createQueryMock = () => ({
    populate: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Setup the find method
    mockTaskModel.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([mockTask]),
    });
    
    // Setup the findById method
    mockTaskModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockTask),
    });
    
    // Setup the findOne method
    mockTaskModel.findOne.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockTask),
    });
    
    // Setup the deleteOne method
    mockTaskModel.deleteOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    });
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getModelToken('Task'),
          useValue: mockTaskModel,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    taskModel = module.get(getModelToken('Task'));
  });

  describe('create', () => {
    it('should create a task', async () => {
      const createTaskDto: CreateTaskDto = {
        title: 'Test Task',
        description: 'Test Description',
        price: 100,
      };

      const mockUserDocument = {
        _id: new Types.ObjectId(mockUserId),
        id: mockUserId,
        toString: () => mockUserId
      };

      // Expected task data with required fields
      const expectedTaskData = {
        ...createTaskDto,
        postedBy: mockUserDocument._id,
        status: TaskStatus.OPEN,
      };
      
      const savedTask = {
        ...expectedTaskData,
        _id: new Types.ObjectId(mockTaskId),
      };
      
      // Create a mock task instance with a save method
      const mockTaskInstance = {
        ...expectedTaskData,
        save: jest.fn().mockResolvedValue(savedTask)
      };
      
      // Mock the task model constructor function
      const originalTaskModel = service['taskModel'];
      service['taskModel'] = jest.fn().mockImplementation(() => mockTaskInstance) as any;
      
      const result = await service.create(createTaskDto, mockUserDocument as any);
      
      // Restore the original task model
      service['taskModel'] = originalTaskModel;
      
      // Verify the result
      expect(mockTaskInstance.save).toHaveBeenCalled();
      expect(result).toEqual(savedTask);
    });
  });

  describe('findAll', () => {
    it('should find all tasks', async () => {
      // Setup the mock to return tasks
      const findMock = createQueryMock();
      findMock.exec.mockResolvedValue([mockTask]);
      mockTaskModel.find.mockReturnValue(findMock);
      
      const result = await service.findAll();
      
      expect(mockTaskModel.find).toHaveBeenCalled();
      expect(result).toEqual([mockTask]);
    });
    
    it('should find all tasks by poster', async () => {
      const mockTasks = [mockTask];
      mockTaskModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTasks)
          })
        })
      });

      const result = await service.findAllByPoster(mockUserId);
      
      expect(mockTaskModel.find).toHaveBeenCalledWith({ postedBy: mockUserId });
      expect(result).toEqual(mockTasks);
    });
    
    it('should find all tasks by doer', async () => {
      const mockTasks = [mockTask];
      mockTaskModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTasks)
          })
        })
      });

      const result = await service.findAllByDoer(mockUserId);
      
      expect(mockTaskModel.find).toHaveBeenCalledWith({ acceptedBy: mockUserId });
      expect(result).toEqual(mockTasks);
    });
  });

  describe('findOne', () => {
    it('should find a task by id', async () => {
      // Setup the mock to return a task
      const findByIdMock = createQueryMock();
      findByIdMock.exec.mockResolvedValue(mockTask);
      mockTaskModel.findById.mockReturnValue(findByIdMock);

      const result = await service.findOne(mockTaskId);
      
      expect(mockTaskModel.findById).toHaveBeenCalledWith(mockTaskId);
      expect(result).toEqual(mockTask);
    });

    it('should throw NotFoundException if task not found', async () => {
      // Setup the mock to return null (task not found)
      const findByIdMock = createQueryMock();
      findByIdMock.exec.mockResolvedValue(null);
      mockTaskModel.findById.mockReturnValue(findByIdMock);

      await expect(service.findOne(mockTaskId)).rejects.toThrow(NotFoundException);
      expect(mockTaskModel.findById).toHaveBeenCalledWith(mockTaskId);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      // Reset all mocks before each test
      jest.clearAllMocks();
    });
    
    it('should update a task', async () => {
      // Create a populated task with the correct owner for authorization check
      const populatedTask = {
        _id: new Types.ObjectId(mockTaskId),
        title: 'Test Task',
        status: TaskStatus.OPEN,
        postedBy: {
          _id: new Types.ObjectId(mockUserId),
          id: mockUserId,
          toString: () => mockUserId
        },
        // Add a save method that returns a promise with the updated task
        save: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(mockTaskId),
          ...updateTaskDto,
          postedBy: {
            _id: new Types.ObjectId(mockUserId),
            id: mockUserId
          },
          status: TaskStatus.OPEN
        })
      };
      
      // Mock the findOne method to return the populated task
      jest.spyOn(service, 'findOne').mockResolvedValue(populatedTask as any);

      const result = await service.update(mockTaskId, updateTaskDto, mockUserId);
      
      // Verify that findOne was called with the correct task ID
      expect(service.findOne).toHaveBeenCalledWith(mockTaskId);
      
      // Verify that save was called on the task
      expect(populatedTask.save).toHaveBeenCalled();
      
      // Verify the result is what we expect
      expect(result).toHaveProperty('_id');
      expect(result).toHaveProperty('postedBy');
      expect(result).toHaveProperty('title', updateTaskDto.title);
    });
    
    it('should throw ForbiddenException if user is not the poster', async () => {
      const differentUserId = '6507f6b76a9c6a9c6a9c6a9e';
      const updateTaskDto: UpdateTaskDto = {
        title: 'Updated Task',
      };
      
      // Create a populated task for the findOne method
      const populatedTask = {
        _id: new Types.ObjectId(mockTaskId),
        title: 'Original Task',
        status: TaskStatus.OPEN,
        postedBy: {
          _id: new Types.ObjectId(mockUserId),
          id: mockUserId,
          toString: () => mockUserId
        },
        save: jest.fn()
      };
      
      // Mock the findOne method to return the populated task
      jest.spyOn(service, 'findOne').mockResolvedValue(populatedTask as any);
      
      await expect(service.update(mockTaskId, updateTaskDto, differentUserId))
        .rejects.toThrow(ForbiddenException);
      
      expect(service.findOne).toHaveBeenCalledWith(mockTaskId);
      expect(populatedTask.save).not.toHaveBeenCalled();
    });
    
    it('should throw ForbiddenException if task is completed or cancelled', async () => {
      const updateTaskDto: UpdateTaskDto = {
        title: 'Updated Task',
      };
      
      // Create a populated task with COMPLETED status
      const populatedTask = {
        _id: new Types.ObjectId(mockTaskId),
        title: 'Original Task',
        status: TaskStatus.COMPLETED,
        postedBy: {
          _id: new Types.ObjectId(mockUserId),
          id: mockUserId,
          toString: () => mockUserId
        },
        save: jest.fn()
      };
      
      // Mock the findOne method to return the populated task
      jest.spyOn(service, 'findOne').mockResolvedValue(populatedTask as any);
      
      await expect(service.update(mockTaskId, updateTaskDto, mockUserId))
        .rejects.toThrow(ForbiddenException);
      
      expect(service.findOne).toHaveBeenCalledWith(mockTaskId);
      expect(populatedTask.save).not.toHaveBeenCalled();
    });
    
    it('should throw NotFoundException if task not found', async () => {
      const updateTaskDto: UpdateTaskDto = {
        title: 'Updated Task',
      };
      
      // Mock findOne to throw NotFoundException
      jest.spyOn(service, 'findOne').mockImplementation(() => {
        throw new NotFoundException(`Task with ID ${mockTaskId} not found`);
      });
      
      await expect(service.update(mockTaskId, updateTaskDto, mockUserId))
        .rejects.toThrow(NotFoundException);
      
      expect(service.findOne).toHaveBeenCalledWith(mockTaskId);
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      // Reset all mocks before each test
      jest.clearAllMocks();
    });
    
    it('should remove a task', async () => {
      // Create a populated task with the correct owner
      const populatedTask = {
        _id: new Types.ObjectId(mockTaskId),
        title: 'Test Task',
        status: TaskStatus.OPEN,
        postedBy: {
          _id: new Types.ObjectId(mockUserId),
          id: mockUserId,
          toString: () => mockUserId
        }
      };
      
      // Mock the findOne method to return the populated task
      jest.spyOn(service, 'findOne').mockResolvedValue(populatedTask as any);
      
      // Setup deleteOne to return success
      const deleteOneMock = createQueryMock();
      deleteOneMock.exec.mockResolvedValue({ deletedCount: 1 });
      mockTaskModel.deleteOne.mockReturnValue(deleteOneMock);

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
        title: 'Test Task',
        status: TaskStatus.OPEN,
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

  describe('acceptTask', () => {
    beforeEach(() => {
      // Reset all mocks before each test
      jest.clearAllMocks();
    });
    
    it('should accept a task', async () => {
      // Use a different user ID for the doer
      const doerId = '6507f6b76a9c6a9c6a9c6a9e';
      
      // Create a populated task for the findOne method
      const populatedTask = {
        _id: new Types.ObjectId(mockTaskId),
        title: 'Test Task',
        status: TaskStatus.OPEN,
        postedBy: {
          _id: new Types.ObjectId(mockUserId),
          id: mockUserId,
          toString: () => mockUserId
        },
        acceptedBy: null,
        save: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(mockTaskId),
          status: TaskStatus.IN_PROGRESS,
          postedBy: {
            _id: new Types.ObjectId(mockUserId),
            id: mockUserId,
            toString: () => mockUserId
          },
          acceptedBy: {
            _id: new Types.ObjectId(doerId),
            id: doerId,
            toString: () => doerId
          }
        })
      };
      
      // Mock the findOne method to return the populated task
      jest.spyOn(service, 'findOne').mockResolvedValue(populatedTask as any);
      
      const result = await service.acceptTask(mockTaskId, doerId);
      
      expect(service.findOne).toHaveBeenCalledWith(mockTaskId);
      expect(populatedTask.save).toHaveBeenCalled();
      expect(result.status).toEqual(TaskStatus.IN_PROGRESS);
      expect(result.acceptedBy).toBeDefined();
    });
    
    it('should throw ForbiddenException if user is the poster', async () => {
      // Create a populated task for the findOne method
      const populatedTask = {
        _id: new Types.ObjectId(mockTaskId),
        title: 'Test Task',
        status: TaskStatus.OPEN,
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
      
      await expect(service.acceptTask(mockTaskId, mockUserId))
        .rejects.toThrow(ForbiddenException);
      
      expect(service.findOne).toHaveBeenCalledWith(mockTaskId);
      expect(populatedTask.save).not.toHaveBeenCalled();
    });
    
    it('should throw ForbiddenException if task is already accepted', async () => {
      const differentUserId = '6507f6b76a9c6a9c6a9c6a9e';
      
      // Create a populated task with an acceptedBy user
      const populatedTask = {
        _id: new Types.ObjectId(mockTaskId),
        title: 'Test Task',
        status: TaskStatus.IN_PROGRESS,
        postedBy: {
          _id: new Types.ObjectId(mockUserId),
          id: mockUserId,
          toString: () => mockUserId
        },
        acceptedBy: {
          _id: new Types.ObjectId('6507f6b76a9c6a9c6a9c6a9f'),
          id: '6507f6b76a9c6a9c6a9c6a9f',
          toString: () => '6507f6b76a9c6a9c6a9c6a9f'
        },
        save: jest.fn()
      };
      
      // Mock the findOne method to return the populated task
      jest.spyOn(service, 'findOne').mockResolvedValue(populatedTask as any);
      
      await expect(service.acceptTask(mockTaskId, differentUserId))
        .rejects.toThrow(ForbiddenException);
      
      expect(service.findOne).toHaveBeenCalledWith(mockTaskId);
      expect(populatedTask.save).not.toHaveBeenCalled();
    });
  });

  describe('completeTask', () => {
    beforeEach(() => {
      // Reset all mocks before each test
      jest.clearAllMocks();
    });
    
    it('should complete a task', async () => {
      // Create a populated task for the findOne method
      const populatedTask = {
        _id: new Types.ObjectId(mockTaskId),
        title: 'Test Task',
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
          status: TaskStatus.COMPLETED,
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
      
      const result = await service.completeTask(mockTaskId, mockUserId);
      
      expect(service.findOne).toHaveBeenCalledWith(mockTaskId);
      expect(populatedTask.save).toHaveBeenCalled();
      expect(result.status).toEqual(TaskStatus.COMPLETED);
    });
    
    it('should throw ForbiddenException if user is not the poster', async () => {
      const differentUserId = '6507f6b76a9c6a9c6a9c6a9f';
      
      // Create a populated task for the findOne method
      const populatedTask = {
        _id: new Types.ObjectId(mockTaskId),
        title: 'Test Task',
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
      
      await expect(service.completeTask(mockTaskId, differentUserId))
        .rejects.toThrow(ForbiddenException);
      
      expect(service.findOne).toHaveBeenCalledWith(mockTaskId);
      expect(populatedTask.save).not.toHaveBeenCalled();
    });
    
    it('should throw ForbiddenException if task is not in progress', async () => {
      // Create a populated task with OPEN status
      const populatedTask = {
        _id: new Types.ObjectId(mockTaskId),
        title: 'Test Task',
        status: TaskStatus.OPEN,
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
      
      await expect(service.completeTask(mockTaskId, mockUserId))
        .rejects.toThrow(ForbiddenException);
      
      expect(service.findOne).toHaveBeenCalledWith(mockTaskId);
      expect(populatedTask.save).not.toHaveBeenCalled();
    });
  });

  describe('cancelTask', () => {
    beforeEach(() => {
      // Reset all mocks before each test
      jest.clearAllMocks();
    });
    
    it('should cancel a task as poster', async () => {
      // Create a populated task for the findOne method
      const populatedTask = {
        _id: new Types.ObjectId(mockTaskId),
        title: 'Test Task',
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
    
    it('should cancel a task as doer and clear acceptedBy', async () => {
      const doerId = '6507f6b76a9c6a9c6a9c6a9e';
      
      // Create a populated task for the findOne method
      const populatedTask = {
        _id: new Types.ObjectId(mockTaskId),
        title: 'Test Task',
        status: TaskStatus.IN_PROGRESS,
        postedBy: {
          _id: new Types.ObjectId(mockUserId),
          id: mockUserId,
          toString: () => mockUserId
        },
        acceptedBy: {
          _id: new Types.ObjectId(doerId),
          id: doerId,
          toString: () => doerId
        },
        save: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(mockTaskId),
          status: TaskStatus.CANCELLED,
          postedBy: {
            _id: new Types.ObjectId(mockUserId),
            id: mockUserId,
            toString: () => mockUserId
          },
          acceptedBy: undefined
        })
      };
      
      // Mock the findOne method to return the populated task
      jest.spyOn(service, 'findOne').mockResolvedValue(populatedTask as any);
      
      const result = await service.cancelTask(mockTaskId, doerId);
      
      expect(service.findOne).toHaveBeenCalledWith(mockTaskId);
      expect(populatedTask.save).toHaveBeenCalled();
      expect(result.status).toEqual(TaskStatus.CANCELLED);
      expect(result.acceptedBy).toBeUndefined();
    });
    
    it('should throw ForbiddenException if user is not poster or doer', async () => {
      const differentUserId = '6507f6b76a9c6a9c6a9c6a9f';
      
      // Create a populated task for the findOne method
      const populatedTask = {
        _id: new Types.ObjectId(mockTaskId),
        title: 'Test Task',
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
        title: 'Test Task',
        status: TaskStatus.COMPLETED,
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
      
      // The test expects a ForbiddenException with the message 'Cannot cancel a completed task.'
      await expect(service.cancelTask(mockTaskId, mockUserId))
        .rejects.toThrow(new ForbiddenException('Cannot cancel a completed task.'));
      
      expect(service.findOne).toHaveBeenCalledWith(mockTaskId);
      expect(populatedTask.save).not.toHaveBeenCalled();
    });
  });
});
