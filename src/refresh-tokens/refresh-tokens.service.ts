import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Cron } from '@nestjs/schedule';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import {
  RefreshToken,
  RefreshTokenDocument,
} from './schemas/refresh-token.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { JwtRefreshPayload } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class RefreshTokensService {
  constructor(
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshTokenDocument>,
    private jwtService: JwtService,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async create(
    userId: string,
    payload: JwtRefreshPayload,
    jti: string,
  ): Promise<string> {
    try {
      const token = this.jwtService.sign(payload, {
        expiresIn: '30d',
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const activeTokens = await this.refreshTokenModel
        .find({
          user: userId,
          isRevoked: false,
          expiresAt: { $gt: new Date() },
        })
        .exec();

      if (activeTokens.length >= 3) {
        const tokenToDelete = activeTokens.reduce((prev, curr) =>
          prev.expiresAt < curr.expiresAt ? prev : curr,
        );

        await this.refreshTokenModel
          .findByIdAndDelete(tokenToDelete._id)
          .exec();
      }
      const hashedToken = await bcrypt.hash(token, 10);

      console.log('REFRESH TOKEN CREATE: userId received:', userId);
      console.log('REFRESH TOKEN CREATE: typeof userId:', typeof userId);

      // Find user by UUID (id field) - this is what's passed from auth service
      const user = await this.userModel.findOne({ id: userId }).exec();

      console.log('REFRESH TOKEN CREATE: user found:', user);

      if (!user) {
        throw new InternalServerErrorException(
          `User not found with id: ${userId}`,
        );
      }

      const refreshToken = new this.refreshTokenModel({
        user: userId,
        jti,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });

      await refreshToken.save();

      return token;
    } catch (error) {
      console.error('REFRESH TOKEN CREATE ERROR:', error);
      throw new InternalServerErrorException('Error creating refresh token');
    }
  }

  async findOne(jti: string): Promise<RefreshToken | null> {
    return await this.refreshTokenModel.findOne({ jti }).exec();
  }

  async revoke(jti: string): Promise<void> {
    await this.refreshTokenModel.updateOne({ jti }, { isRevoked: true }).exec();
  }

  async revokeAllTokensForUser(userId: string): Promise<void> {
    await this.refreshTokenModel
      .updateMany({ user: userId }, { isRevoked: true })
      .exec();
  }

  async deleteExpiredTokens(): Promise<void> {
    const now = new Date();
    await this.refreshTokenModel
      .deleteMany({
        expiresAt: { $lt: now },
      })
      .exec();
  }

  @Cron('0 0 */7 * *')
  async handleExpiredTokensDeletion() {
    await this.deleteExpiredTokens();
  }
}
