import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task, TaskStatus, PopulatedTask } from './schemas/task.schema';
import { Types } from 'mongoose';
import { AuthFastifyRequest } from '../auth/interfaces/auth-fastify-request.interface';
import { Role } from '../users/interfaces/role.enum';
import { User } from '../users/schemas/user.schema';

describe('TasksController', () => {
  let controller: TasksController;
  let tasksService: jest.Mocked<TasksService>;

  const mockTaskId = '6507f6b76a9c6a9c6a9c6a9c';
  const mockUserId = '6507f6b76a9c6a9c6a9c6a9d';

  // Create a mock task with necessary properties and methods to satisfy both Task and PopulatedTask interfaces
  const mockTask = {
    _id: new Types.ObjectId('6507f6b76a9c6a9c6a9c6a9c'),
    title: 'Test Task',
    description: 'Test Description',
    price: 100,
    status: TaskStatus.OPEN,
    postedBy: {
      _id: new Types.ObjectId('6507f6b76a9c6a9c6a9c6a9d'),
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      role: Role.USER,
      toString: () => '6507f6b76a9c6a9c6a9c6a9d'
    } as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    // Add minimal mongoose document methods
    save: jest.fn().mockResolvedValue(this),
  } as unknown as PopulatedTask & Task;

  const mockRequest = {
    user: {
      id: mockUserId,
      sub: mockUserId,
      email: 'test@example.com',
      role: Role.USER,
    },
  } as unknown as AuthFastifyRequest;

  beforeEach(async () => {
    const tasksServiceMock = {
      create: jest.fn(),
      findAll: jest.fn(),
      findAllByPoster: jest.fn(),
      findAllByDoer: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      acceptTask: jest.fn(),
      completeTask: jest.fn(),
      cancelTask: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: tasksServiceMock,
        },
      ],
    }).compile();

    controller = module.get<TasksController>(TasksController);
    tasksService = module.get(TasksService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a task', async () => {
      const createTaskDto: CreateTaskDto = {
        title: 'New Task',
        description: 'Task Description',
        price: 50,
      };

      tasksService.create.mockResolvedValue(mockTask);

      const result = await controller.create(createTaskDto, mockRequest);

      expect(tasksService.create).toHaveBeenCalledWith(createTaskDto, mockRequest.user);
      expect(result).toEqual(mockTask);
    });
  });

  describe('findAll', () => {
    it('should return all tasks when no query params', async () => {
      const mockTasks = [mockTask] as unknown as PopulatedTask[];
      tasksService.findAll.mockResolvedValue(mockTasks);

      const result = await controller.findAll();

      expect(tasksService.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockTasks);
    });

    it('should return tasks by poster when postedBy is provided', async () => {
      const mockTasks = [mockTask] as unknown as PopulatedTask[];
      tasksService.findAllByPoster.mockResolvedValue(mockTasks);

      const result = await controller.findAll(mockUserId);

      expect(tasksService.findAllByPoster).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(mockTasks);
    });

    it('should return tasks by doer when acceptedBy is provided', async () => {
      const mockTasks = [mockTask] as unknown as PopulatedTask[];
      tasksService.findAllByDoer.mockResolvedValue(mockTasks);

      const result = await controller.findAll(undefined, mockUserId);

      expect(tasksService.findAllByDoer).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(mockTasks);
    });
  });

  describe('findOne', () => {
    it('should return a task by id', async () => {
      tasksService.findOne.mockResolvedValue(mockTask as unknown as PopulatedTask);

      const result = await controller.findOne(mockTaskId);

      expect(tasksService.findOne).toHaveBeenCalledWith(mockTaskId);
      expect(result).toEqual(mockTask);
    });
  });

  describe('update', () => {
    it('should update a task', async () => {
      const updateTaskDto: UpdateTaskDto = {
        title: 'Updated Task',
      };

      const updatedTask = {
        ...mockTask,
        title: 'Updated Task',
      } as unknown as PopulatedTask;

      tasksService.update.mockResolvedValue(updatedTask);

      const result = await controller.update(mockTaskId, updateTaskDto, mockRequest);

      expect(tasksService.update).toHaveBeenCalledWith(mockTaskId, updateTaskDto, mockUserId);
      expect(result).toEqual(updatedTask);
    });
  });

  describe('remove', () => {
    it('should remove a task', async () => {
      const deleteResult = { deleted: true };
      tasksService.remove.mockResolvedValue(deleteResult);

      const result = await controller.remove(mockTaskId, mockRequest);

      expect(tasksService.remove).toHaveBeenCalledWith(mockTaskId, mockUserId);
      expect(result).toEqual(deleteResult);
    });
  });

  describe('acceptTask', () => {
    it('should accept a task', async () => {
      const acceptedTask = {
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
        acceptedBy: {
          _id: new Types.ObjectId(mockUserId),
          firstName: 'Doer',
          lastName: 'User',
          email: 'doer@example.com',
          role: Role.USER,
          toString: () => mockUserId
        }
      } as unknown as PopulatedTask;

      tasksService.acceptTask.mockResolvedValue(acceptedTask);

      const result = await controller.acceptTask(mockTaskId, mockRequest);

      expect(tasksService.acceptTask).toHaveBeenCalledWith(mockTaskId, mockUserId);
      expect(result).toEqual(acceptedTask);
    });
  });

  describe('completeTask', () => {
    it('should complete a task', async () => {
      const completedTask = {
        ...mockTask,
        status: TaskStatus.COMPLETED,
      } as unknown as PopulatedTask;

      tasksService.completeTask.mockResolvedValue(completedTask);

      const result = await controller.completeTask(mockTaskId, mockRequest);

      expect(tasksService.completeTask).toHaveBeenCalledWith(mockTaskId, mockUserId);
      expect(result).toEqual(completedTask);
    });
  });

  describe('cancelTask', () => {
    it('should cancel a task', async () => {
      const cancelledTask = {
        ...mockTask,
        status: TaskStatus.CANCELLED,
      } as unknown as PopulatedTask;

      tasksService.cancelTask.mockResolvedValue(cancelledTask);

      const result = await controller.cancelTask(mockTaskId, mockRequest);

      expect(tasksService.cancelTask).toHaveBeenCalledWith(mockTaskId, mockUserId);
      expect(result).toEqual(cancelledTask);
    });
  });
});
