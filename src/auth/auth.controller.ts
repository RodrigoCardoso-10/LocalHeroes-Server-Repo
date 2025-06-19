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
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @Req() req: AuthFastifyRequest,
    @Res() res: FastifyReply,
  ): Promise<void> {
    const { accessToken, refreshToken } = await this.authService.login(
      req.user,
    );
    res.raw.setHeader('Set-Cookie', [
      `refreshToken=${refreshToken}; HttpOnly; Path=/; SameSite=None; Secure`,
      `accessToken=${accessToken}; HttpOnly; Path=/; SameSite=None; Secure`,
    ]);
    res.send({ accessToken, refreshToken });
  }

  @UseGuards(JwtAuthGuard)
  @Delete('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ): Promise<void> {
    const refreshToken = req.cookies['refreshToken'];
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    res.raw.setHeader('Set-Cookie', [
      `refreshToken=; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
      `accessToken=; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
    ]);
    res.status(200).send({ message: 'Logged out successfully' });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ): Promise<void> {
    const refreshToken = req.cookies['refreshToken'];
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }
    const { accessToken } = await this.authService.refreshToken(refreshToken);
    res.raw.setHeader(
      'Set-Cookie',
      `accessToken=${accessToken}; HttpOnly; Path=/; SameSite=None; Secure`,
    );
    res.send({ accessToken });
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
    @Res() res: FastifyReply,
  ): Promise<void> {
    try {
      const { accessToken, refreshToken, user } =
        await this.authService.googleLogin(req);
      res.raw.setHeader('Set-Cookie', [
        `refreshToken=${refreshToken}; HttpOnly; Path=/; SameSite=None; Secure`,
        `accessToken=${accessToken}; HttpOnly; Path=/; SameSite=None; Secure`,
      ]);
      res.redirect('/chat.html');
    } catch (error) {
      res.redirect('/login?error=true');
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
      req.user.password,
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
