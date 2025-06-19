import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokensService } from '../refresh-tokens/refresh-tokens.service';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../users/schemas/user.schema';
import {
  JwtAccessPayload,
  JwtRefreshPayload,
} from './interfaces/jwt-payload.interface';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private refreshTokensService: RefreshTokensService,
    private mailService: MailService,
  ) {}

  generateAccessToken(payload: JwtAccessPayload): string {
    try {
      return this.jwtService.sign(payload, {
        expiresIn: '7d',
        secret: process.env.JWT_SECRET,
      });
    } catch (error) {
      throw new InternalServerErrorException('Error generating access token');
    }
  }

  async validateRefreshToken(refreshToken: string): Promise<JwtRefreshPayload> {
    try {
      const decoded = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const token = await this.refreshTokensService.findOne(decoded.jti);
      if (!token || token.isRevoked || token.expiresAt < new Date()) {
        throw new Error();
      }

      const isValid = await bcrypt.compare(refreshToken, token.token);
      if (!isValid) {
        throw new Error();
      }

      return {
        sub: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        jti: decoded.jti,
      };
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async validateUser(
    email: string,
    pass: string,
  ): Promise<Omit<User, 'password'>> {
    try {
      const user = await this.usersService.findOneByEmail(email, [
        'id',
        'email',
        'role',
        'password',
      ]);
      console.log('validateUser: user from DB:', user);
      if (!user) {
        throw new ForbiddenException('Invalid credentials');
      }
      if (!user.password) {
        console.error('validateUser: password field missing from user!');
      }
      const isMatch = await bcrypt.compare(pass, user.password);
      if (!isMatch) {
        throw new ForbiddenException('Invalid credentials');
      } // Convert Mongoose document to plain object and extract needed fields
      const userObj = user.toObject ? user.toObject() : user;
      const { password, __v, ...result } = userObj;

      // Ensure we have the MongoDB _id field
      if (!result._id) {
        throw new ForbiddenException('User missing identifier');
      }

      console.log('validateUser: result after destructuring:', result);
      return result;
    } catch (error) {
      throw error;
    }
  }
  async login(user: any) {
    try {
      console.log(
        'LOGIN: user.id being passed to refreshTokensService.create:',
        user.id,
      );
      console.log('LOGIN: full user object:', user);
      const jti = uuidv4();
      const payload = {
        email: user.email,
        sub: user._id, // Use _id for JWT payload
        jti,
        role: user.role,
      };
      const accessToken = this.generateAccessToken(payload);
      const refreshToken = await this.refreshTokensService.create(
        user.id, // Use UUID for refresh tokens service
        payload,
        jti,
      );
      // Omit password from user object
      const { password, ...userWithoutPassword } = user as any;
      return {
        accessToken,
        refreshToken,
        user: userWithoutPassword,
      };
    } catch (error) {
      console.error('LOGIN ERROR:', error);
      throw new InternalServerErrorException('Error during login process');
    }
  }

  async logout(refreshToken: string) {
    try {
      const decoded = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      await this.refreshTokensService.revoke(decoded.jti);
      return { message: 'Logout successful' };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = await this.validateRefreshToken(refreshToken);
      const newAccessToken = this.generateAccessToken({
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
      });
      return {
        accessToken: newAccessToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async requestPasswordReset(email: string) {
    try {
      const user = await this.usersService.findOneByEmail(email);
      if (user) {
        await this.mailService.sendPasswordResetEmail(
          email,
          this.jwtService.sign(
            { userId: user._id },
            {
              expiresIn: '20m',
              secret: process.env.JWT_PASSWORD_SECRET,
            },
          ),
        );
      }
      return {
        message: `If an account with the email ${email} exists, a password reset link has been sent.`,
        statusCode: 200,
      };
    } catch (error) {
      return {
        message: `If an account with the email ${email} exists, a password reset link has been sent.`,
        statusCode: 200,
      };
    }
  }

  async confirmResetPassword(token: string, password: string) {
    try {
      const decoded = await this.jwtService.verify(token, {
        secret: process.env.JWT_PASSWORD_SECRET,
      });
      const user = await this.usersService.findOneById(decoded.userId);
      if (!user) {
        throw new Error();
      }
      user.password = await bcrypt.hash(password, 10);
      await this.usersService.save(user);
      return {
        message: 'Your password has been successfully reset.',
        statusCode: 201,
      };
    } catch (error) {
      throw new UnauthorizedException(
        'The provided token is invalid or has expired.',
      );
    }
  }

  async googleLogin(req) {
    if (!req.user) {
      throw new UnauthorizedException('No user from Google');
    }

    try {
      let user;
      try {
        user = await this.usersService.findOneByEmail(req.user.email);
      } catch (error) {
        if (error instanceof NotFoundException) {
          const randomPassword = uuidv4();
          const hashedPassword = await bcrypt.hash(randomPassword, 10);
          user = await this.usersService.create({
            email: req.user.email,
            password: hashedPassword,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
          });
        } else {
          throw error;
        }
      }

      return this.login(user);
    } catch (error) {
      console.error('Google authentication error:', error);
      throw new InternalServerErrorException(
        'Error during Google authentication',
      );
    }
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
    const user = await this.usersService.findOneById(userId);
    if (!user.password) {
      throw new UnauthorizedException('No password set for user.');
    }
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Old password is incorrect.');
    }
    user.password = await bcrypt.hash(newPassword, 10);
    await this.usersService.save(user);
    return { message: 'Password changed successfully.' };
  }
}
