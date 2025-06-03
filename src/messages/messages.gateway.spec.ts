import { Test, TestingModule } from '@nestjs/testing';
import { MessagesGateway } from './messages.gateway';
import { MessagesService } from './messages.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket, Server } from 'socket.io';
import { CreateMessageDto } from './dto/create-message.dto';
import { UnauthorizedException } from '@nestjs/common';

describe('MessagesGateway', () => {
  let gateway: MessagesGateway;
  let messagesService: MessagesService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockMessagesService = {
    create: jest.fn(),
    getUnreadCount: jest.fn(),
    markAsRead: jest.fn(),
  };

  const mockJwtService = {
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockMessage = {
    id: 'test-message-id',
    senderId: 'sender-id',
    receiverId: 'receiver-id',
    content: 'Hello, this is a test message',
    read: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockServer = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };

  const mockClient = {
    id: 'socket-id',
    data: { userId: '' } as { userId: string },
    handshake: {
      auth: { token: '' } as { token: string },
      headers: {} as Record<string, string>,
    },
    join: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesGateway,
        { provide: MessagesService, useValue: mockMessagesService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    gateway = module.get<MessagesGateway>(MessagesGateway);
    messagesService = module.get<MessagesService>(MessagesService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    // Mock the server
    gateway.server = mockServer as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should authenticate user and set up socket connection', async () => {
      const token = 'valid-jwt-token';
      const userId = 'user-id';
      const unreadCount = 3;

      mockClient.handshake.auth.token = token;
      mockConfigService.get.mockReturnValue('jwt-secret');
      mockJwtService.verify.mockReturnValue({ sub: userId });
      mockMessagesService.getUnreadCount.mockResolvedValue(unreadCount);

      await gateway.handleConnection(mockClient as unknown as Socket);

      expect(mockClient.data.userId).toBe(userId);
      expect(mockClient.join).toHaveBeenCalledWith(`user_${userId}`);
      expect(mockClient.emit).toHaveBeenCalledWith('unread_count', { count: unreadCount });
      expect(mockJwtService.verify).toHaveBeenCalledWith(token, { secret: 'jwt-secret' });
    });

    it('should disconnect client if token is missing', async () => {
      mockClient.handshake.auth = { token: '' } as { token: string };
      mockClient.handshake.headers = {};

      await gateway.handleConnection(mockClient as unknown as Socket);

      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it('should disconnect client if token is invalid', async () => {
      mockClient.handshake.auth.token = 'invalid-token';
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await gateway.handleConnection(mockClient as unknown as Socket);

      expect(mockClient.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should remove socket from user connections', () => {
      mockClient.data.userId = 'user-id';
      mockClient.id = 'socket-id-1';

      // Setup the userSocketMap with multiple sockets for the user
      gateway['userSocketMap'].set('user-id', ['socket-id-1', 'socket-id-2']);

      gateway.handleDisconnect(mockClient as unknown as Socket);

      // Should keep the other socket
      expect(gateway['userSocketMap'].get('user-id')).toEqual(['socket-id-2']);
    });

    it('should remove user from map if no sockets remain', () => {
      mockClient.data.userId = 'user-id';
      mockClient.id = 'socket-id-1';

      // Setup the userSocketMap with only one socket for the user
      gateway['userSocketMap'].set('user-id', ['socket-id-1']);

      gateway.handleDisconnect(mockClient as unknown as Socket);

      // Should delete the user entry
      expect(gateway['userSocketMap'].has('user-id')).toBe(false);
    });

    it('should do nothing if user is not authenticated', () => {
      mockClient.data = { userId: '' } as { userId: string };
      gateway['userSocketMap'].set('user-id', ['socket-id-1']);

      gateway.handleDisconnect(mockClient as unknown as Socket);

      // Should not change the map
      expect(gateway['userSocketMap'].get('user-id')).toEqual(['socket-id-1']);
    });
  });

  describe('handleSendMessage', () => {
    it('should create and broadcast a new message', async () => {
      const userId = 'sender-id';
      const createMessageDto: CreateMessageDto = {
        receiverId: 'receiver-id',
        content: 'Hello, this is a test message',
      };

      mockClient.data.userId = userId;
      mockMessagesService.create.mockResolvedValue(mockMessage);
      mockMessagesService.getUnreadCount.mockResolvedValue(1);

      const result = await gateway.handleSendMessage(
        mockClient as unknown as Socket,
        createMessageDto,
      );

      expect(result).toEqual(mockMessage);
      expect(mockMessagesService.create).toHaveBeenCalledWith(userId, createMessageDto);
      expect(mockClient.emit).toHaveBeenCalledWith('new_message', mockMessage);
      expect(mockServer.to).toHaveBeenCalledWith(`user_${createMessageDto.receiverId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('new_message', mockMessage);
      expect(mockMessagesService.getUnreadCount).toHaveBeenCalledWith(createMessageDto.receiverId);
    });

    it('should throw UnauthorizedException if user is not authenticated', async () => {
      mockClient.data = { userId: '' } as { userId: string };
      const createMessageDto: CreateMessageDto = {
        receiverId: 'receiver-id',
        content: 'Hello, this is a test message',
      };

      await expect(
        gateway.handleSendMessage(mockClient as unknown as Socket, createMessageDto),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('handleMarkRead', () => {
    it('should mark a message as read and update unread count', async () => {
      const userId = 'user-id';
      const messageId = 'message-id';
      const updatedMessage = { ...mockMessage, read: true };
      const unreadCount = 0;

      mockClient.data.userId = userId;
      mockMessagesService.markAsRead.mockResolvedValue(updatedMessage);
      mockMessagesService.getUnreadCount.mockResolvedValue(unreadCount);

      const result = await gateway.handleMarkRead(
        mockClient as unknown as Socket,
        { messageId },
      );

      expect(result).toEqual(updatedMessage);
      expect(mockMessagesService.markAsRead).toHaveBeenCalledWith(userId, messageId);
      expect(mockClient.emit).toHaveBeenCalledWith('unread_count', { count: unreadCount });
    });

    it('should not update unread count if message not found', async () => {
      const userId = 'user-id';
      const messageId = 'non-existent-message-id';

      mockClient.data.userId = userId;
      mockMessagesService.markAsRead.mockResolvedValue(null);

      const result = await gateway.handleMarkRead(
        mockClient as unknown as Socket,
        { messageId },
      );

      expect(result).toBeNull();
      expect(mockMessagesService.getUnreadCount).not.toHaveBeenCalled();
      expect(mockClient.emit).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user is not authenticated', async () => {
      mockClient.data = { userId: '' } as { userId: string };

      await expect(
        gateway.handleMarkRead(mockClient as unknown as Socket, { messageId: 'message-id' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('handleJoinConversation', () => {
    it('should join a conversation room', () => {
      const userId = 'user-id';
      const otherUserId = 'other-user-id';
      const expectedRoomName = 'conversation_other-user-id_user-id'; // Sorted alphabetically

      mockClient.data.userId = userId;

      const result = gateway.handleJoinConversation(
        mockClient as unknown as Socket,
        { otherUserId },
      );

      expect(result).toEqual({ success: true });
      expect(mockClient.join).toHaveBeenCalledWith(expectedRoomName);
    });

    it('should throw UnauthorizedException if user is not authenticated', () => {
      mockClient.data = { userId: '' } as { userId: string };

      expect(() =>
        gateway.handleJoinConversation(mockClient as unknown as Socket, {
          otherUserId: 'other-user-id',
        }),
      ).toThrow(UnauthorizedException);
    });
  });
});
