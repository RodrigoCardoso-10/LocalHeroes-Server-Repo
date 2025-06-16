const { MongoClient } = require('mongodb');

// MongoDB connection configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/localheroes';

async function clearAndSeed() {
  let client;
  
  try {
    console.log('Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db();
    
    // Clear existing tasks
    console.log('Clearing existing tasks...');
    const deleteResult = await db.collection('tasks').deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} existing tasks`);
    
    // Get existing users
    const users = await db.collection('users').find({}).toArray();
    console.log(`Found ${users.length} users`);
    
    if (users.length === 0) {
      console.log('No users found! Please run user seeding first.');
      return;
    }
    
    // Sample tasks
    const sampleTasks = [
      {
        title: 'Garden Maintenance and Lawn Mowing',
        description: 'Looking for someone to maintain my garden including lawn mowing, weeding, and basic trimming. The garden is medium-sized with mostly grass and some flower beds.',
        location: 'Amsterdam',
        price: 35,
        category: 'Gardening',
        tags: ['outdoor', 'weekly', 'maintenance'],
        experienceLevel: 'Beginner',
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
        postedBy: users[0]._id,
      },
      {
        title: 'House Deep Cleaning',
        description: 'Need a thorough deep cleaning of my 3-bedroom apartment. Includes kitchen, bathrooms, living areas, and bedrooms. All cleaning supplies provided.',
        location: 'Rotterdam',
        price: 80,
        category: 'Cleaning',
        tags: ['indoor', 'deep-clean', 'urgent'],
        experienceLevel: 'Intermediate',
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
        postedBy: users[1 % users.length]._id,
      },
      {
        title: 'Moving Assistance - Furniture and Boxes',
        description: 'Moving to a new apartment and need help with packing, loading, and unloading. Mostly furniture and boxes. Truck is provided, just need strong hands.',
        location: 'Utrecht',
        price: 120,
        category: 'Moving',
        tags: ['physical', 'urgent', 'weekend'],
        experienceLevel: 'No experience',
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
        postedBy: users[2 % users.length]._id,
      },
      {
        title: 'Dog Walking and Pet Sitting',
        description: 'Looking for a reliable person to walk my golden retriever twice a day and occasionally pet-sit when I travel. Dog is friendly and well-trained.',
        location: 'The Hague',
        price: 25,
        category: 'Pet Care',
        tags: ['pets', 'daily', 'flexible'],
        experienceLevel: 'No experience',
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
        postedBy: users[3 % users.length]._id,
      },
      {
        title: 'Small Electrical Repairs',
        description: 'Need someone to fix a few electrical issues: replace light switches, install new outlets, and check wiring in the basement. Must have electrical experience.',
        location: 'Eindhoven',
        price: 150,
        category: 'Electrical',
        tags: ['technical', 'safety', 'certified'],
        experienceLevel: 'Expert',
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
        postedBy: users[4 % users.length]._id,
      },
      {
        title: 'Furniture Assembly (IKEA)',
        description: 'Just bought several pieces of furniture from IKEA and need help assembling them. Includes a wardrobe, desk, bookshelf, and some chairs.',
        location: 'Amsterdam',
        price: 60,
        category: 'Assembly',
        tags: ['indoor', 'tools-provided', 'weekend'],
        experienceLevel: 'Beginner',
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
        postedBy: users[0]._id,
      },
      {
        title: 'Window Cleaning - Apartment Building',
        description: 'Looking for professional window cleaning for a 2-story apartment. Both interior and exterior windows. Safety equipment must be provided.',
        location: 'Rotterdam',
        price: 45,
        category: 'Cleaning',
        tags: ['outdoor', 'height', 'professional'],
        experienceLevel: 'Intermediate',
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
        postedBy: users[1 % users.length]._id,
      },
      {
        title: 'Computer Setup and Tech Support',
        description: 'Need help setting up a new computer system, installing software, and transferring files from old computer. Some technical knowledge required.',
        location: 'Utrecht',
        price: 75,
        category: 'Technology',
        tags: ['indoor', 'technical', 'software'],
        experienceLevel: 'Intermediate',
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
        postedBy: users[2 % users.length]._id,
      },
      {
        title: 'Grocery Shopping and Delivery',
        description: 'Regular grocery shopping assistance needed. Will provide shopping list and payment. Prefer someone with their own transportation.',
        location: 'The Hague',
        price: 30,
        category: 'Shopping',
        tags: ['regular', 'transportation', 'flexible'],
        experienceLevel: 'No experience',
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
        postedBy: users[3 % users.length]._id,
      },
      {
        title: 'Painting Interior Walls',
        description: 'Need 2 rooms painted in my house. Paint and materials provided. Looking for someone with painting experience for a clean, professional finish.',
        location: 'Eindhoven',
        price: 200,
        category: 'Painting',
        tags: ['indoor', 'materials-provided', 'skilled'],
        experienceLevel: 'Intermediate',
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
        postedBy: users[4 % users.length]._id,
      },
    ];
    
    // Insert tasks
    console.log('Inserting tasks...');
    const taskResult = await db.collection('tasks').insertMany(sampleTasks);
    console.log(`Successfully inserted ${taskResult.insertedCount} tasks`);
    
    // Verify
    const taskCount = await db.collection('tasks').countDocuments();
    console.log(`Total tasks in database: ${taskCount}`);
    
    // Show sample
    const tasks = await db.collection('tasks').find({}).limit(3).toArray();
    console.log('\nSample tasks:');
    tasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.title} - ${task.location} - €${task.price}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

clearAndSeed();
