import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { getModelToken } from '@nestjs/mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { Role } from './interfaces/role.enum';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let userModel: any;

  const mockUser: User = {
    id: 'test-uuid',
    firstName: 'John',
    lastName: 'Doe',
    email: 'test@example.com',
    password: 'hashedPassword',
    role: Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
    emailVerifiedAt: null,
  };

  beforeEach(async () => {
    // Create mock for Mongoose Model
    const mockUserModel = function() {
      return {
        ...mockUser,
        save: jest.fn().mockResolvedValue(mockUser)
      };
    };
    
    // Add methods to the mockUserModel function
    mockUserModel.find = jest.fn();
    mockUserModel.findOne = jest.fn();
    mockUserModel.findOneAndUpdate = jest.fn();
    mockUserModel.update = jest.fn();
    mockUserModel.create = jest.fn();
    mockUserModel.save = jest.fn();
    mockUserModel.exec = jest.fn();

    // Setup for chained queries
    mockUserModel.findOne = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      }),
      exec: jest.fn().mockResolvedValue(mockUser),
    });

    mockUserModel.findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockUser),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userModel = module.get(getModelToken(User.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      const createUserDto: CreateUserDto = {
        firstName: 'Test',
        lastName: 'User',
        email: 'new@example.com',
        password: 'password123',
      };

      userModel.findOne().exec.mockResolvedValueOnce(null);

      const newUser = { ...mockUser };
      jest.spyOn(userModel, 'create').mockImplementationOnce(() => ({
        save: jest.fn().mockResolvedValueOnce(newUser),
      }));

      (bcrypt.genSalt as jest.Mock).mockResolvedValueOnce('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashedPassword');

      const result = await service.create(createUserDto);

      expect(userModel.findOne).toHaveBeenCalledWith({
        email: createUserDto.email,
      });
      expect(result).toEqual(newUser);
    });

    it('should throw ConflictException if email already exists', async () => {
      const createUserDto: CreateUserDto = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'password123',
      };

      userModel.findOne().exec.mockResolvedValueOnce(mockUser);

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findOneById', () => {
    it('should find a user by id successfully', async () => {
      const result = await service.findOneById(mockUser.id);
      expect(userModel.findOne).toHaveBeenCalledWith({ id: mockUser.id });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found by id', async () => {
      userModel.findOne().exec.mockResolvedValueOnce(null);
      await expect(service.findOneById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOneByEmail', () => {
    it('should find a user by email successfully', async () => {
      const result = await service.findOneByEmail(mockUser.email);
      expect(userModel.findOne).toHaveBeenCalledWith({ email: mockUser.email });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found by email', async () => {
      userModel.findOne().exec.mockResolvedValueOnce(null);
      await expect(service.findOneByEmail('wrong@email.com')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should apply select fields if provided', async () => {
      const selectFields = ['id', 'email', 'role'];
      await service.findOneByEmail(mockUser.email, selectFields);

      expect(userModel.findOne().select).toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    it('should update a user successfully', async () => {
      const updateUserDto: UpdateUserDto = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      const result = await service.updateUser(mockUser.id, updateUserDto);

      expect(userModel.findOne).toHaveBeenCalledWith({ id: mockUser.id });
      expect(userModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: mockUser.id },
        { $set: updateUserDto },
        { new: true },
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user to update not found', async () => {
      userModel.findOne().exec.mockResolvedValueOnce(null);

      await expect(
        service.updateUser('non-existent-id', { firstName: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should remove password field from update DTO', async () => {
      const updateUserDto = {
        firstName: 'Updated',
        lastName: 'Name',
        password: 'newpassword123',
      };

      await service.updateUser(mockUser.id, updateUserDto);

      expect(userModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: mockUser.id },
        { $set: { firstName: 'Updated', lastName: 'Name' } },
        { new: true },
      );
    });
  });

  describe('save', () => {
    it('should save user successfully', async () => {
      // Cast mockUser to UserDocument for type compatibility
      const mockUserDoc = mockUser as unknown as UserDocument;
      const result = await service.save(mockUserDoc);

      expect(userModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: mockUser.id },
        mockUser,
        { new: true, upsert: true },
      );
      expect(result).toEqual(mockUser);
    });
  });
});
