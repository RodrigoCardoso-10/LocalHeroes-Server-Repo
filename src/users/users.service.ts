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

  async create(userData: CreateUserDto): Promise<User> {
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

  async findOneById(id: string) {
    const user = await this.userModel.findOne({ id }).exec();
    if (!user) {
      const errorMessage = `User with ID ${id} not found.`;
      throw new NotFoundException(errorMessage);
    }
    return user;
  }

  async findOneByEmail(email: string, select?: string) {
    let query = this.userModel.findOne({ email });

    if (select) {
      query = query.select(select);
    }

    const user = await query.exec();
    if (!user) {
      const errorMessage = `User with email ${email} not found.`;
      throw new NotFoundException(errorMessage);
    }
    return user;
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userModel.findOne({ id }).exec();

    if (!user) {
      const errorMessage = `User with ID ${id} not found.`;
      throw new NotFoundException(errorMessage);
    }

    if ('password' in updateUserDto) {
      delete updateUserDto.password;
    }

    return await this.userModel
      .findOneAndUpdate({ id }, { $set: updateUserDto }, { new: true })
      .exec();
  }

  async save(user: User): Promise<User> {
    const savedUser = await this.userModel
      .findOneAndUpdate({ id: user.id }, user, { new: true, upsert: true })
      .exec();
    return savedUser;
  }
}
