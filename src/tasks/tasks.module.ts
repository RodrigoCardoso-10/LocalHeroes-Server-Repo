import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task, TaskSchema } from './schemas/task.schema';
import { UsersModule } from '../users/users.module'; // Import UsersModule if task service/controller interacts with User documents directly or needs UserService

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
    UsersModule, // Make sure UsersModule exports UserModel or UserService if needed by Tasks module
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService], // Export TasksService if it needs to be used by other modules
})
export class TasksModule {}
