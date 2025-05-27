import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*', // In production, restrict this to your frontend domain
  },
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSocketMap = new Map<string, string[]>();

  constructor(
    private readonly messagesService: MessagesService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        throw new UnauthorizedException('No token provided');
      }
      
      const jwtSecret = this.configService.get<string>('JWT_SECRET');
      const payload = this.jwtService.verify(token, { secret: jwtSecret });
      const userId = payload.sub;
      
      client.data.userId = userId;
      
      // Store socket connection for this user
      const userSockets = this.userSocketMap.get(userId) || [];
      userSockets.push(client.id);
      this.userSocketMap.set(userId, userSockets);
      
      // Join a room specific to this user
      client.join(`user_${userId}`);
      
      // Send unread message count to user
      const unreadCount = await this.messagesService.getUnreadCount(userId);
      client.emit('unread_count', { count: unreadCount });
      
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      // Remove this socket from user's connections
      const userSockets = this.userSocketMap.get(userId) || [];
      const updatedSockets = userSockets.filter(id => id !== client.id);
      
      if (updatedSockets.length > 0) {
        this.userSocketMap.set(userId, updatedSockets);
      } else {
        this.userSocketMap.delete(userId);
      }
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() createMessageDto: CreateMessageDto,
  ) {
    const userId = client.data.userId;
    
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    
    // Save message to database
    const message = await this.messagesService.create(userId, createMessageDto);
    
    // Emit to sender
    client.emit('new_message', message);
    
    // Emit to receiver
    this.server.to(`user_${createMessageDto.receiverId}`).emit('new_message', message);
    
    // Update unread count for receiver
    const unreadCount = await this.messagesService.getUnreadCount(createMessageDto.receiverId);
    this.server.to(`user_${createMessageDto.receiverId}`).emit('unread_count', { count: unreadCount });
    
    return message;
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string },
  ) {
    const userId = client.data.userId;
    
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    
    const message = await this.messagesService.markAsRead(userId, data.messageId);
    
    if (message) {
      // Update unread count for the user
      const unreadCount = await this.messagesService.getUnreadCount(userId);
      client.emit('unread_count', { count: unreadCount });
    }
    
    return message;
  }

  @SubscribeMessage('join_conversation')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { otherUserId: string },
  ) {
    const userId = client.data.userId;
    
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    
    // Create a unique room name for this conversation
    const participants = [userId, data.otherUserId].sort().join('_');
    const roomName = `conversation_${participants}`;
    
    // Join the conversation room
    client.join(roomName);
    
    return { success: true };
  }
}
