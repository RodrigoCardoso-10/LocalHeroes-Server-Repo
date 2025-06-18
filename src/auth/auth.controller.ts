import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { FastifyRequest, FastifyReply } from 'fastify';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import {
  AuthFastifyRequest,
  LoginFastifyRequest,
} from './interfaces/auth-fastify-request.interface';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Req() req: LoginFastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    // Call AuthService.login and get tokens and user
    const { accessToken, refreshToken, user } = await this.authService.login(
      req.user,
    );

    // Configure cookies to work with React Native app
    const isProduction = process.env.NODE_ENV === 'production';
    res.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction, // Only use secure in production
      sameSite: 'none', // Allow cross-site cookies for mobile app
    });
    res.setCookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction, // Only use secure in production
      sameSite: 'none', // Allow cross-site cookies for mobile app
    });

    // Return both token and user info (with UUID)
    return res.send({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        emailVerifiedAt: user.emailVerifiedAt,
      },
    });
  }

  @UseGuards(JwtAuthGuard)
  @Delete('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const refreshToken = req.cookies['refreshToken'];
    if (!refreshToken) {
      throw new BadRequestException('Refresh token is missing');
    }

    res.clearCookie('refreshToken');

    return await this.authService.logout(refreshToken);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const refreshToken = req.cookies['refreshToken'];
    if (!refreshToken) {
      throw new BadRequestException('Refresh token is missing');
    }

    const { accessToken } = await this.authService.refreshToken(refreshToken);

    // Configure cookies to work with React Native app
    const isProduction = process.env.NODE_ENV === 'production';

    res.setCookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction, // Only use secure in production
      sameSite: 'none', // Allow cross-site cookies for mobile app
    });

    return { accessToken };
  }

  @Post('password-reset')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(
    @Body() RequestPasswordResetDto: RequestPasswordResetDto,
  ) {
    return await this.authService.requestPasswordReset(
      RequestPasswordResetDto.email,
    );
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async confirmResetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return await this.authService.confirmResetPassword(
      resetPasswordDto.token,
      resetPasswordDto.password,
    );
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    return { message: 'Redirecting to Google' };
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(
    @Req() req: any,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    try {
      if (!req.user) {
        return res.status(401).send({ message: 'Authentication failed' });
      }

      const { accessToken, refreshToken } =
        await this.authService.googleLogin(req);

      res.setCookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
      });

      res.setCookie('accessToken', accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
      });

      return res.send({ accessToken });
    } catch (error) {
      return res.status(500).send({
        message: 'Error during Google authentication',
        error: error.message,
      });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Req() req: AuthFastifyRequest,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const isMatch = await bcrypt.compare(
      changePasswordDto.oldPassword,
      req.user.password
    );
    if (!isMatch) {
      throw new UnauthorizedException('Old password is incorrect.');
    }

    return await this.authService.changePassword(
      req.user.id,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
    );
  }
}
