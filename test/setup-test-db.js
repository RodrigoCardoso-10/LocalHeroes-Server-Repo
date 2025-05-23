const { MongoClient } = require('mongodb');

async function setupTestDatabase() {
  console.log('Setting up test database...');
  
  const host = process.env.MONGO_HOST || 'localhost';
  const port = process.env.MONGO_PORT || 27017;
  const user = process.env.MONGO_USERNAME || 'root';
  const password = process.env.MONGO_PASSWORD || 'admin';
  const testDbName = 'test_db';
  
  try {
    // Create a connection string - handles authentication if credentials provided
    const uri = user && password 
      ? `mongodb://${user}:${password}@${host}:${port}` 
      : `mongodb://${host}:${port}`;
    
    // Create a MongoDB client
    const client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    // Connect to MongoDB
    await client.connect();
    
    // Drop the test database if it exists
    const db = client.db(testDbName);
    await db.dropDatabase();
    
    console.log(`Test database '${testDbName}' reset successfully`);
    await client.close();
    
    return true;
  } catch (error) {
    console.error('Failed to set up test database:', error);
    console.log('Continuing with tests without database reset...');
    return true;
  }
}

if (require.main === module) {
  setupTestDatabase()
    .then(success => process.exit(success ? 0 : 1));
} else {
  module.exports = setupTestDatabase;
}