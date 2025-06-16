const { MongoClient } = require('mongodb');

// MongoDB connection configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/localheroes';

async function checkDatabase() {
  let client;
  
  try {
    console.log('Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db();
    
    // Check collections
    console.log('\n=== Database Status ===');
    
    const usersCount = await db.collection('users').countDocuments();
    console.log(`Users: ${usersCount}`);
    
    const tasksCount = await db.collection('tasks').countDocuments();
    console.log(`Tasks: ${tasksCount}`);
    
    // Show sample data
    console.log('\n=== Sample Users ===');
    const users = await db.collection('users').find({}).limit(3).toArray();
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
    });
    
    console.log('\n=== Sample Tasks ===');
    const tasks = await db.collection('tasks').find({}).limit(5).toArray();
    tasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.title} - ${task.location} - €${task.price}`);
    });
    
    console.log('\n=== Tasks by Category ===');
    const tasksByCategory = await db.collection('tasks').aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    tasksByCategory.forEach((category) => {
      console.log(`${category._id}: ${category.count} tasks`);
    });
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Run the check
checkDatabase();
