import { Test, TestingModule } from '@nestjs/testing';
import { RefreshTokensService } from './refresh-tokens.service';
import { getModelToken } from '@nestjs/mongoose';
import { Role } from '../users/interfaces/role.enum';
import { JwtService } from '@nestjs/jwt';
import { RefreshToken } from './schemas/refresh-token.schema';
import { User } from '../users/schemas/user.schema';
import { Model } from 'mongoose';
import { InternalServerErrorException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtRefreshPayload } from '../auth/interfaces/jwt-payload.interface';

jest.mock('bcrypt');

describe('RefreshTokensService', () => {
  let service: RefreshTokensService;
  let refreshTokenModel: Model<RefreshToken>;
  let userModel: Model<User>;
  let jwtService: JwtService;

  const mockUserModel = {
    findOne: jest.fn(),
    exec: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockRefreshToken = {
    id: 'refresh-token-id',
    user: 'user-id',
    token: 'hashed-token',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isRevoked: false,
    jti: 'token-jti',
    save: jest.fn(),
    _id: 'mongo-id',
  };

  // Create a constructor function for the refreshTokenModel
  const mockRefreshTokenModel = function() {
    return mockRefreshToken;
  };
  
  // Add methods to the mockRefreshTokenModel
  mockRefreshTokenModel.find = jest.fn();
  mockRefreshTokenModel.findOne = jest.fn();
  mockRefreshTokenModel.findByIdAndDelete = jest.fn();
  mockRefreshTokenModel.updateOne = jest.fn();
  mockRefreshTokenModel.updateMany = jest.fn();
  mockRefreshTokenModel.deleteMany = jest.fn();
  mockRefreshTokenModel.exec = jest.fn();

  const mockUser = {
    id: 'user-id',
    email: 'test@example.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokensService,
        {
          provide: getModelToken(RefreshToken.name),
          useValue: mockRefreshTokenModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<RefreshTokensService>(RefreshTokensService);
    refreshTokenModel = module.get<Model<RefreshToken>>(getModelToken(RefreshToken.name));
    userModel = module.get<Model<User>>(getModelToken(User.name));
    jwtService = module.get<JwtService>(JwtService);

    // Mock environment variables
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new refresh token', async () => {
      const userId = 'user-id';
      const jti = 'token-jti';
      const payload: JwtRefreshPayload = {
        sub: userId,
        email: 'test@example.com',
        role: Role.USER,
        jti,
      };
      const token = 'new-refresh-token';

      // Mock active tokens (less than limit)
      mockRefreshTokenModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      // Mock user find
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      // Mock JWT sign
      mockJwtService.sign.mockReturnValue(token);

      // Mock bcrypt hash
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-token');

      // Mock save
      mockRefreshToken.save.mockResolvedValue(mockRefreshToken);

      const result = await service.create(userId, payload, jti);

      expect(result).toEqual(token);
      expect(jwtService.sign).toHaveBeenCalledWith(payload, {
        expiresIn: '30d',
        secret: 'test-refresh-secret',
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(token, 10);
      expect(userModel.findOne).toHaveBeenCalledWith({ id: userId });
      expect(mockRefreshToken.save).toHaveBeenCalled();
    });

    it('should delete oldest token if limit is reached', async () => {
      const userId = 'user-id';
      const jti = 'token-jti';
      const payload: JwtRefreshPayload = {
        sub: userId,
        email: 'test@example.com',
        role: Role.USER,
        jti,
      };
      const token = 'new-refresh-token';

      // Create 3 active tokens (at limit)
      const activeTokens = [
        {
          _id: 'token1',
          expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days
        },
        {
          _id: 'token2',
          expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days - oldest
        },
        {
          _id: 'token3',
          expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
        },
      ];

      mockRefreshTokenModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(activeTokens),
      });

      mockRefreshTokenModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue({}),
      });

      // Mock user find
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      // Mock JWT sign
      mockJwtService.sign.mockReturnValue(token);

      // Mock bcrypt hash
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-token');

      // Mock save
      mockRefreshToken.save.mockResolvedValue(mockRefreshToken);

      const result = await service.create(userId, payload, jti);

      expect(result).toEqual(token);
      expect(refreshTokenModel.findByIdAndDelete).toHaveBeenCalledWith('token2');
    });

    it('should throw InternalServerErrorException if user not found', async () => {
      const userId = 'non-existent-user-id';
      const jti = 'token-jti';
      const payload: JwtRefreshPayload = {
        sub: userId,
        email: 'test@example.com',
        role: Role.USER,
        jti,
      };

      mockRefreshTokenModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      mockJwtService.sign.mockReturnValue('token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-token');

      await expect(service.create(userId, payload, jti)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findOne', () => {
    it('should find a refresh token by jti', async () => {
      const jti = 'token-jti';

      mockRefreshTokenModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockRefreshToken),
      });

      const result = await service.findOne(jti);

      expect(result).toEqual(mockRefreshToken);
      expect(refreshTokenModel.findOne).toHaveBeenCalledWith({ jti });
    });

    it('should return null if token not found', async () => {
      const jti = 'non-existent-jti';

      mockRefreshTokenModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findOne(jti);

      expect(result).toBeNull();
    });
  });

  describe('revoke', () => {
    it('should revoke a refresh token', async () => {
      const jti = 'token-jti';

      mockRefreshTokenModel.updateOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      });

      await service.revoke(jti);

      expect(refreshTokenModel.updateOne).toHaveBeenCalledWith(
        { jti },
        { isRevoked: true },
      );
    });
  });

  describe('revokeAllTokensForUser', () => {
    it('should revoke all tokens for a user', async () => {
      const userId = 'user-id';

      mockRefreshTokenModel.updateMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 3 }),
      });

      await service.revokeAllTokensForUser(userId);

      expect(refreshTokenModel.updateMany).toHaveBeenCalledWith(
        { user: userId },
        { isRevoked: true },
      );
    });
  });

  describe('deleteExpiredTokens', () => {
    it('should delete all expired tokens', async () => {
      mockRefreshTokenModel.deleteMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 5 }),
      });

      await service.deleteExpiredTokens();

      expect(refreshTokenModel.deleteMany).toHaveBeenCalledWith({
        expiresAt: { $lt: expect.any(Date) },
      });
    });
  });

  describe('handleExpiredTokensDeletion', () => {
    it('should call deleteExpiredTokens', async () => {
      const spy = jest.spyOn(service, 'deleteExpiredTokens').mockResolvedValue();

      await service.handleExpiredTokensDeletion();

      expect(spy).toHaveBeenCalled();
    });
  });
});
