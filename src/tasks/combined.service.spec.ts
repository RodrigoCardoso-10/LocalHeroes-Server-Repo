import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskStatus } from './schemas/task.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('TasksService', () => {
  let service: TasksService;
  let taskModel: Model<Task>;

  const mockTaskId = '6507f6b76a9c6a9c6a9c6a9c';
  const mockUserId = '6507f6b76a9c6a9c6a9c6a9d';

  const mockTask = {
    _id: mockTaskId,
    title: 'Test Task',
    description: 'Test Description',
    price: 100,
    status: TaskStatus.OPEN,
    postedBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn(),
  };

  // Mock task with save method
  const mockTaskWithSave = {
    ...mockTask,
    save: jest.fn().mockResolvedValue(mockTask)
  };

  // Create a proper constructor function that can be used with 'new'
  const mockTaskModel: any = jest.fn().mockImplementation((data: any) => {
    return {
      ...data,
      ...mockTaskWithSave
    };
  });
  
  // Add static methods to the mockTaskModel constructor function
  mockTaskModel.find = jest.fn().mockReturnValue({
    populate: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockTask])
      })
    })
  });
  mockTaskModel.findOne = jest.fn().mockReturnValue({
    populate: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTask)
      })
    })
  });
  mockTaskModel.findById = jest.fn().mockReturnValue({
    populate: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTask)
      })
    })
  });
  mockTaskModel.findByIdAndUpdate = jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue(mockTask)
  });
  mockTaskModel.findByIdAndDelete = jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue(mockTask)
  });
  mockTaskModel.deleteOne = jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue({ deletedCount: 1 })
  });

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

  describe('create', () => {
    it('should create a task', async () => {
      const createTaskDto: CreateTaskDto = {
        title: 'Test Task',
        description: 'Test Description',
        price: 100,
      };

      // Create a mock UserDocument
      const mockUserDocument = {
        _id: new Types.ObjectId(mockUserId),
        id: mockUserId,
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        toString: () => mockUserId
      };

      // Reset mocks before test
      jest.clearAllMocks();
      
      const result = await service.create(createTaskDto, mockUserDocument as any);

      // Verify the constructor was called with the correct data
      expect(mockTaskModel).toHaveBeenCalledWith({
        ...createTaskDto,
        postedBy: mockUserDocument._id,
        status: TaskStatus.OPEN,
      });
      expect(result).toEqual(mockTask);
    });
  });

  describe('findAll', () => {
    it('should find all tasks', async () => {
      const mockTasks = [mockTask];
      mockTaskModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTasks)
          })
        })
      });

      const result = await service.findAll();

      expect(mockTaskModel.find).toHaveBeenCalled();
      expect(result).toEqual(mockTasks);
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
      const populatedTask = {
        ...mockTask,
        postedBy: {
          _id: new Types.ObjectId(mockUserId),
          id: mockUserId,
          toString: () => mockUserId
        }
      };

      mockTaskModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(populatedTask)
          })
        })
      });

      const result = await service.findOne(mockTaskId);

      expect(mockTaskModel.findById).toHaveBeenCalledWith(mockTaskId);
      expect(result).toEqual(populatedTask);
    });

    it('should throw NotFoundException if task not found', async () => {
      mockTaskModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(null)
          })
        })
      });

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
        save: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(mockTaskId),
          title: 'Updated Task',
          status: TaskStatus.OPEN,
          postedBy: {
            _id: new Types.ObjectId(mockUserId),
            id: mockUserId,
            toString: () => mockUserId
          }
        })
      };
      
      // Mock the findOne method to return the populated task
      jest.spyOn(service, 'findOne').mockResolvedValue(populatedTask as any);
      
      const result = await service.update(mockTaskId, updateTaskDto, mockUserId);
      
      expect(service.findOne).toHaveBeenCalledWith(mockTaskId);
      expect(populatedTask.save).toHaveBeenCalled();
      expect(result.title).toEqual('Updated Task');
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
      
      // Mock the deleteOne method
      mockTaskModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 })
      });
      
      await service.remove(mockTaskId, mockUserId);
      
      expect(service.findOne).toHaveBeenCalledWith(mockTaskId);
      expect(mockTaskModel.deleteOne).toHaveBeenCalledWith({ _id: mockTaskId });
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
