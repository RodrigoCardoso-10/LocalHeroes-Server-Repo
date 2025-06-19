import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Patch,
  UseGuards,
  Req,
  Delete,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './schemas/user.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthFastifyRequest } from '../auth/interfaces/auth-fastify-request.interface';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return await this.usersService.create(createUserDto);
  }
  @UseGuards(JwtAuthGuard)
  @Get('userdata')
  async findOne(@Req() req: AuthFastifyRequest): Promise<User> {
    return await this.usersService.findOneById(req.user._id.toString());
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(
    @Req() req: AuthFastifyRequest,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return await this.usersService.updateUser(
      req.user._id.toString(),
      updateUserDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('deposit')
  async deposit(
    @Req() req: AuthFastifyRequest,
    @Body() { amount }: { amount: number },
  ): Promise<User> {
    return await this.usersService.deposit(req.user._id.toString(), amount);
  }
}
