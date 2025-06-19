import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { TaskSeeder } from '../seeders/task.seeder';

async function runSeeder() {
  try {
    const app = await NestFactory.createApplicationContext(AppModule);

    console.log('Starting database seeding...');

    const taskSeeder = app.get(TaskSeeder);
    await taskSeeder.seed();

    console.log('Seeding completed successfully!');

    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
}

runSeeder();
