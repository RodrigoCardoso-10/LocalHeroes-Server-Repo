const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

// MongoDB connection configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://GroupI:admin@groupi.ei1sl0s.mongodb.net/?retryWrites=true&w=majority&appName=GroupI';

const cityCoordinates = {
  Amsterdam: [4.9041, 52.3676],
  Rotterdam: [4.47917, 51.9225],
  Utrecht: [5.1214, 52.0907],
  'The Hague': [4.3007, 52.0705],
  Eindhoven: [5.4697, 51.4416],
};

// Sample data
const sampleUsers = [
  {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    password: 'password123', // Will be hashed
    skills: ['gardening', 'maintenance'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    password: 'password123',
    skills: ['cleaning', 'organizing'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    firstName: 'Mike',
    lastName: 'Johnson',
    email: 'mike.johnson@example.com',
    password: 'password123',
    skills: ['moving', 'physical labor'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    firstName: 'Sarah',
    lastName: 'Williams',
    email: 'sarah.williams@example.com',
    password: 'password123',
    skills: ['pet care', 'dog walking'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    firstName: 'David',
    lastName: 'Brown',
    email: 'david.brown@example.com',
    password: 'password123',
    skills: ['electrical', 'technical'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const sampleTasks = [
  {
    title: 'Garden Maintenance and Lawn Mowing',
    description: 'Looking for someone to maintain my garden including lawn mowing, weeding, and basic trimming. The garden is medium-sized with mostly grass and some flower beds.',
    location: { address: 'Amsterdam', point: { type: 'Point', coordinates: cityCoordinates.Amsterdam } },
    price: 35,
    category: 'Gardening',
    tags: ['outdoor', 'weekly', 'maintenance'],
    experienceLevel: 'Beginner',
    status: 'open',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    title: 'House Deep Cleaning',
    description: 'Need a thorough deep cleaning of my 3-bedroom apartment. Includes kitchen, bathrooms, living areas, and bedrooms. All cleaning supplies provided.',
    location: { address: 'Rotterdam', point: { type: 'Point', coordinates: cityCoordinates.Rotterdam } },
    price: 80,
    category: 'Cleaning',
    tags: ['indoor', 'deep-clean', 'urgent'],
    experienceLevel: 'Intermediate',
    status: 'open',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    title: 'Moving Assistance - Furniture and Boxes',
    description: 'Moving to a new apartment and need help with packing, loading, and unloading. Mostly furniture and boxes. Truck is provided, just need strong hands.',
    location: { address: 'Utrecht', point: { type: 'Point', coordinates: cityCoordinates.Utrecht } },
    price: 120,
    category: 'Moving',
    tags: ['physical', 'urgent', 'weekend'],
    experienceLevel: 'No experience',
    status: 'open',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    title: 'Dog Walking and Pet Sitting',
    description: 'Looking for a reliable person to walk my golden retriever twice a day and occasionally pet-sit when I travel. Dog is friendly and well-trained.',
    location: { address: 'The Hague', point: { type: 'Point', coordinates: cityCoordinates['The Hague'] } },
    price: 25,
    category: 'Pet Care',
    tags: ['pets', 'daily', 'flexible'],
    experienceLevel: 'No experience',
    status: 'open',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    title: 'Small Electrical Repairs',
    description: 'Need someone to fix a few electrical issues: replace light switches, install new outlets, and check wiring in the basement. Must have electrical experience.',
    location: { address: 'Eindhoven', point: { type: 'Point', coordinates: cityCoordinates.Eindhoven } },
    price: 150,
    category: 'Electrical',
    tags: ['technical', 'safety', 'certified'],
    experienceLevel: 'Expert',
    status: 'open',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    title: 'Furniture Assembly (IKEA)',
    description: 'Just bought several pieces of furniture from IKEA and need help assembling them. Includes a wardrobe, desk, bookshelf, and some chairs.',
    location: { address: 'Amsterdam', point: { type: 'Point', coordinates: cityCoordinates.Amsterdam } },
    price: 60,
    category: 'Assembly',
    tags: ['indoor', 'tools-provided', 'weekend'],
    experienceLevel: 'Beginner',
    status: 'open',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    title: 'Window Cleaning - Apartment Building',
    description: 'Looking for professional window cleaning for a 2-story apartment. Both interior and exterior windows. Safety equipment must be provided.',
    location: { address: 'Rotterdam', point: { type: 'Point', coordinates: cityCoordinates.Rotterdam } },
    price: 45,
    category: 'Cleaning',
    tags: ['outdoor', 'height', 'professional'],
    experienceLevel: 'Intermediate',
    status: 'open',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    title: 'Computer Setup and Tech Support',
    description: 'Need help setting up a new computer system, installing software, and transferring files from old computer. Some technical knowledge required.',
    location: { address: 'Utrecht', point: { type: 'Point', coordinates: cityCoordinates.Utrecht } },
    price: 75,
    category: 'Technology',
    tags: ['indoor', 'technical', 'software'],
    experienceLevel: 'Intermediate',
    status: 'open',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    title: 'Grocery Shopping and Delivery',
    description: 'Regular grocery shopping assistance needed. Will provide shopping list and payment. Prefer someone with their own transportation.',
    location: { address: 'The Hague', point: { type: 'Point', coordinates: cityCoordinates['The Hague'] } },
    price: 30,
    category: 'Shopping',
    tags: ['regular', 'transportation', 'flexible'],
    experienceLevel: 'No experience',
    status: 'open',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    title: 'Painting Interior Walls',
    description: 'Need 2 rooms painted in my house. Paint and materials provided. Looking for someone with painting experience for a clean, professional finish.',
    location: { address: 'Eindhoven', point: { type: 'Point', coordinates: cityCoordinates.Eindhoven } },
    price: 200,
    category: 'Painting',
    tags: ['indoor', 'materials-provided', 'skilled'],
    experienceLevel: 'Intermediate',
    status: 'open',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    title: 'Basic Plumbing Repair',
    description: 'Have a leaky faucet and a clogged drain that need fixing. Basic plumbing knowledge required. Tools can be provided if needed.',
    location: { address: 'Amsterdam', point: { type: 'Point', coordinates: cityCoordinates.Amsterdam } },
    price: 85,
    category: 'Plumbing',
    tags: ['technical', 'urgent', 'tools-available'],
    experienceLevel: 'Intermediate',
    status: 'open',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    title: 'Event Setup and Cleanup',
    description: 'Need help setting up for a birthday party (tables, chairs, decorations) and cleaning up afterwards. Event is this weekend.',
    location: { address: 'Rotterdam', point: { type: 'Point', coordinates: cityCoordinates.Rotterdam } },
    price: 90,
    category: 'Events',
    tags: ['weekend', 'party', 'setup'],
    experienceLevel: 'No experience',
    status: 'open',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    title: 'Bicycle Repair and Tune-up',
    description: 'My bicycle needs a general tune-up: brake adjustment, gear shifting fix, tire check, and chain lubrication. Some bike repair experience preferred.',
    location: { address: 'Utrecht', point: { type: 'Point', coordinates: cityCoordinates.Utrecht } },
    price: 40,
    category: 'Repair',
    tags: ['outdoor', 'mechanical', 'bike'],
    experienceLevel: 'Beginner',
    status: 'open',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    title: 'Tutoring - Basic Math and Science',
    description: 'Looking for someone to tutor my teenager in basic math and science subjects. 2-3 sessions per week, flexible schedule.',
    location: { address: 'The Hague', point: { type: 'Point', coordinates: cityCoordinates['The Hague'] } },
    price: 25,
    category: 'Education',
    tags: ['tutoring', 'flexible', 'regular'],
    experienceLevel: 'Intermediate',
    status: 'open',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    title: 'Car Washing and Detailing',
    description: 'Need someone to wash and detail my car thoroughly. Both interior and exterior cleaning. Will provide all cleaning supplies and equipment.',
    location: { address: 'Eindhoven', point: { type: 'Point', coordinates: cityCoordinates.Eindhoven } },
    price: 50,
    category: 'Cleaning',
    tags: ['outdoor', 'car', 'supplies-provided'],
    experienceLevel: 'Beginner',
    status: 'open',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

async function seedDatabase() {
  let client;
  
  try {
    console.log('Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db();
    
    // Check if data already exists
    const existingUsers = await db.collection('users').countDocuments();
    const existingTasks = await db.collection('tasks').countDocuments();
    
    // if (existingUsers > 0 && existingTasks > 0) {
    //   console.log('Database already has data. Skipping seeding.');
    //   return;
    // }
    
    console.log('Seeding database...');
    
    // Clear existing tasks to re-seed with new geo data
    await db.collection('tasks').deleteMany({});
    console.log('Cleared existing tasks.');

    // Hash passwords for users
    const saltRounds = 10;
    for (let user of sampleUsers) {
      user.password = await bcrypt.hash(user.password, saltRounds);
    }
      // Insert users only if they don't exist
    let userIds = [];
    if (existingUsers === 0) {
      const userResult = await db.collection('users').insertMany(sampleUsers);
      console.log(`Inserted ${userResult.insertedCount} users`);
      userIds = Object.values(userResult.insertedIds);
    } else {
      console.log('Users already exist, fetching existing user IDs...');
      const existingUserDocs = await db.collection('users').find({}).toArray();
      userIds = existingUserDocs.map(user => user._id);
      console.log(`Found ${userIds.length} existing users`);
    }
      // Insert tasks
      // Assign random users to tasks
      const tasksWithUsers = sampleTasks.map((task, index) => ({
        ...task,
        postedBy: userIds[index % userIds.length], // Cycle through users
      }));
      
      const taskResult = await db.collection('tasks').insertMany(tasksWithUsers);
      console.log(`Inserted ${taskResult.insertedCount} tasks`);
    
    console.log('Database seeding completed successfully!');
    
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Run the seeder
seedDatabase();
