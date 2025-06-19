const { MongoClient } = require('mongodb');

async function testDB() {
  try {
    const client = new MongoClient('mongodb://localhost:27017/localheroes');
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const user = await db.collection('users').findOne({});
    console.log('Sample user:', JSON.stringify(user, null, 2));
    
    await client.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testDB();
