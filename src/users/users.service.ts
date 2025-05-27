import {
  ConflictException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async create(userData: CreateUserDto): Promise<UserDocument> {
    const existingUser = await this.userModel
      .findOne({
        email: userData.email,
      })
      .exec();
    if (existingUser) {
      const errorMessage = `User with email ${userData.email} already exists.`;
      throw new ConflictException(errorMessage);
    }

    const salt = await bcrypt.genSalt();
    userData.password = await bcrypt.hash(userData.password, salt);
    const newUser = new this.userModel(userData);
    const savedUser = await newUser.save();
    return savedUser;
  }

  async findOneById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ id }).exec();
    if (!user) {
      const errorMessage = `User with ID ${id} not found.`;
      throw new NotFoundException(errorMessage);
    }
    return user;
  }

  async findOneByEmail(
    email: string,
    select?: string | string[],
  ): Promise<UserDocument> {
    let query = this.userModel.findOne({ email });

    if (select) {
      // Handle both string and string[] cases
      const selectString = Array.isArray(select) ? select.join(' ') : select;
      query = query.select(selectString) as any; // Using type assertion to bypass the TypeScript error
    }

    const user = await query.exec();
    if (!user) {
      const errorMessage = `User with email ${email} not found.`;
      throw new NotFoundException(errorMessage);
    }
    return user; // Use type assertion to ensure the return type is User
  }

  async updateUser(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    const user = await this.userModel.findOne({ id }).exec();

    if (!user) {
      const errorMessage = `User with ID ${id} not found.`;
      throw new NotFoundException(errorMessage);
    }

    if ('password' in updateUserDto) {
      delete updateUserDto.password;
    }

    const updatedUser = await this.userModel
      .findOneAndUpdate({ id }, { $set: updateUserDto }, { new: true })
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(`Failed to update user with ID ${id}`);
    }

    return updatedUser;
  }

  async save(user: UserDocument): Promise<UserDocument> {
    const savedUser = await this.userModel
      .findOneAndUpdate({ id: user.id }, user, { new: true, upsert: true })
      .exec();

    if (!savedUser) {
      throw new NotFoundException(`Failed to save user with ID ${user.id}`);
    }

    return savedUser; // Use type assertion to ensure the return type is User
  }
}
