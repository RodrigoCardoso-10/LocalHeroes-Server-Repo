import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task, TaskStatus } from '../tasks/schemas/task.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class TaskSeeder {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<Task>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}
  async seed() {
    // Check if tasks already exist
    const existingTasks = await this.taskModel.countDocuments();
    if (existingTasks > 0) {
      console.log('Tasks already exist. Skipping seeding.');
      return;
    }

    // Find or create sample users
    let users = await this.userModel.find().limit(5);
    if (users.length === 0) {
      console.log('No users found. Creating sample users...');
      const sampleUsers = [
        {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          password: '$2b$10$example.hash', // This should be properly hashed in real usage
        },
        {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
          password: '$2b$10$example.hash',
        },
        {
          firstName: 'Mike',
          lastName: 'Johnson',
          email: 'mike.johnson@example.com',
          password: '$2b$10$example.hash',
        },
        {
          firstName: 'Sarah',
          lastName: 'Williams',
          email: 'sarah.williams@example.com',
          password: '$2b$10$example.hash',
        },
        {
          firstName: 'David',
          lastName: 'Brown',
          email: 'david.brown@example.com',
          password: '$2b$10$example.hash',
        },
      ];

      try {
        users = await this.userModel.insertMany(sampleUsers);
        console.log(`Created ${users.length} sample users`);
      } catch (error) {
        console.error('Error creating sample users:', error);
        throw error;
      }
    }

    const sampleTasks = [
      {
        title: 'Garden Maintenance and Lawn Mowing',
        description:
          'Looking for someone to maintain my garden including lawn mowing, weeding, and basic trimming. The garden is medium-sized with mostly grass and some flower beds.',
        location: 'Amsterdam',
        price: 35,
        category: 'Gardening',
        tags: ['outdoor', 'weekly', 'maintenance'],
        experienceLevel: 'Beginner',
        status: TaskStatus.OPEN,
        postedBy: users[0]._id,
      },
      {
        title: 'House Deep Cleaning',
        description:
          'Need a thorough deep cleaning of my 3-bedroom apartment. Includes kitchen, bathrooms, living areas, and bedrooms. All cleaning supplies provided.',
        location: 'Rotterdam',
        price: 80,
        category: 'Cleaning',
        tags: ['indoor', 'deep-clean', 'urgent'],
        experienceLevel: 'Intermediate',
        status: TaskStatus.OPEN,
        postedBy: users[1]._id,
      },
      {
        title: 'Moving Assistance - Furniture and Boxes',
        description:
          'Moving to a new apartment and need help with packing, loading, and unloading. Mostly furniture and boxes. Truck is provided, just need strong hands.',
        location: 'Utrecht',
        price: 120,
        category: 'Moving',
        tags: ['physical', 'urgent', 'weekend'],
        experienceLevel: 'No experience',
        status: TaskStatus.OPEN,
        postedBy: users[2]._id,
      },
      {
        title: 'Dog Walking and Pet Sitting',
        description:
          'Looking for a reliable person to walk my golden retriever twice a day and occasionally pet-sit when I travel. Dog is friendly and well-trained.',
        location: 'The Hague',
        price: 25,
        category: 'Pet Care',
        tags: ['pets', 'daily', 'flexible'],
        experienceLevel: 'No experience',
        status: TaskStatus.OPEN,
        postedBy: users[3]._id,
      },
      {
        title: 'Small Electrical Repairs',
        description:
          'Need someone to fix a few electrical issues: replace light switches, install new outlets, and check wiring in the basement. Must have electrical experience.',
        location: 'Eindhoven',
        price: 150,
        category: 'Electrical',
        tags: ['technical', 'safety', 'certified'],
        experienceLevel: 'Expert',
        status: TaskStatus.OPEN,
        postedBy: users[4]._id,
      },
      {
        title: 'Furniture Assembly (IKEA)',
        description:
          'Just bought several pieces of furniture from IKEA and need help assembling them. Includes a wardrobe, desk, bookshelf, and some chairs.',
        location: 'Amsterdam',
        price: 60,
        category: 'Assembly',
        tags: ['indoor', 'tools-provided', 'weekend'],
        experienceLevel: 'Beginner',
        status: TaskStatus.OPEN,
        postedBy: users[0]._id,
      },
      {
        title: 'Window Cleaning - Apartment Building',
        description:
          'Looking for professional window cleaning for a 2-story apartment. Both interior and exterior windows. Safety equipment must be provided.',
        location: 'Rotterdam',
        price: 45,
        category: 'Cleaning',
        tags: ['outdoor', 'height', 'professional'],
        experienceLevel: 'Intermediate',
        status: TaskStatus.OPEN,
        postedBy: users[1]._id,
      },
      {
        title: 'Computer Setup and Tech Support',
        description:
          'Need help setting up a new computer system, installing software, and transferring files from old computer. Some technical knowledge required.',
        location: 'Utrecht',
        price: 75,
        category: 'Technology',
        tags: ['indoor', 'technical', 'software'],
        experienceLevel: 'Intermediate',
        status: TaskStatus.OPEN,
        postedBy: users[2]._id,
      },
      {
        title: 'Grocery Shopping and Delivery',
        description:
          'Regular grocery shopping assistance needed. Will provide shopping list and payment. Prefer someone with their own transportation.',
        location: 'The Hague',
        price: 30,
        category: 'Shopping',
        tags: ['regular', 'transportation', 'flexible'],
        experienceLevel: 'No experience',
        status: TaskStatus.OPEN,
        postedBy: users[3]._id,
      },
      {
        title: 'Painting Interior Walls',
        description:
          'Need 2 rooms painted in my house. Paint and materials provided. Looking for someone with painting experience for a clean, professional finish.',
        location: 'Eindhoven',
        price: 200,
        category: 'Painting',
        tags: ['indoor', 'materials-provided', 'skilled'],
        experienceLevel: 'Intermediate',
        status: TaskStatus.OPEN,
        postedBy: users[4]._id,
      },
      {
        title: 'Basic Plumbing Repair',
        description:
          'Have a leaky faucet and a clogged drain that need fixing. Basic plumbing knowledge required. Tools can be provided if needed.',
        location: 'Amsterdam',
        price: 85,
        category: 'Plumbing',
        tags: ['technical', 'urgent', 'tools-available'],
        experienceLevel: 'Intermediate',
        status: TaskStatus.OPEN,
        postedBy: users[0]._id,
      },
      {
        title: 'Event Setup and Cleanup',
        description:
          'Need help setting up for a birthday party (tables, chairs, decorations) and cleaning up afterwards. Event is this weekend.',
        location: 'Rotterdam',
        price: 90,
        category: 'Events',
        tags: ['weekend', 'party', 'setup'],
        experienceLevel: 'No experience',
        status: TaskStatus.OPEN,
        postedBy: users[1]._id,
      },
      {
        title: 'Bicycle Repair and Tune-up',
        description:
          'My bicycle needs a general tune-up: brake adjustment, gear shifting fix, tire check, and chain lubrication. Some bike repair experience preferred.',
        location: 'Utrecht',
        price: 40,
        category: 'Repair',
        tags: ['outdoor', 'mechanical', 'bike'],
        experienceLevel: 'Beginner',
        status: TaskStatus.OPEN,
        postedBy: users[2]._id,
      },
      {
        title: 'Tutoring - Basic Math and Science',
        description:
          'Looking for someone to tutor my teenager in basic math and science subjects. 2-3 sessions per week, flexible schedule.',
        location: 'The Hague',
        price: 25,
        category: 'Education',
        tags: ['tutoring', 'flexible', 'regular'],
        experienceLevel: 'Intermediate',
        status: TaskStatus.OPEN,
        postedBy: users[3]._id,
      },
      {
        title: 'Car Washing and Detailing',
        description:
          'Need someone to wash and detail my car thoroughly. Both interior and exterior cleaning. Will provide all cleaning supplies and equipment.',
        location: 'Eindhoven',
        price: 50,
        category: 'Cleaning',
        tags: ['outdoor', 'car', 'supplies-provided'],
        experienceLevel: 'Beginner',
        status: TaskStatus.OPEN,
        postedBy: users[4]._id,
      },
    ];

    try {
      const createdTasks = await this.taskModel.insertMany(sampleTasks);
      console.log(`Successfully seeded ${createdTasks.length} tasks`);
      return createdTasks;
    } catch (error) {
      console.error('Error seeding tasks:', error);
      throw error;
    }
  }

  async clearTasks() {
    const result = await this.taskModel.deleteMany({});
    console.log(`Deleted ${result.deletedCount} tasks`);
    return result;
  }
}
