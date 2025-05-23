# MongoDB Migration Guide

This project has been migrated from PostgreSQL/MySQL to MongoDB. Below are the key changes and instructions for setting up MongoDB.

## Changes Made

1. Replaced TypeORM with Mongoose for database interactions
2. Converted entity classes to Mongoose schema definitions
3. Updated service methods to use Mongoose query operations
4. Updated test setup to work with MongoDB

## MongoDB Setup

1. Install MongoDB on your system or use a Docker container:

```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

2. Create a database user (optional):

```javascript
// Connect to MongoDB shell
use admin
db.createUser(
  {
    user: "localheroes",
    pwd: "your_password",
    roles: [
      { role: "readWrite", db: "localheroes" }
    ]
  }
)
```

3. Update your `.env` file with MongoDB configuration:

```
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_USERNAME=localheroes
MONGO_PASSWORD=your_password
MONGO_DB=localheroes
```

## Schema Changes

The data model has been converted from relational tables to MongoDB collections. Key changes include:

1. Relations are now referenced using MongoDB ObjectId
2. All schema definitions are in the `schemas` folder in each module
3. TypeORM decorators were replaced with Mongoose schema decorators

## Running Tests

Tests have been updated to work with MongoDB. Run tests using:

```bash
npm run test
npm run test:e2e
```

## Development

For local development with MongoDB:

1. Start MongoDB server
2. Ensure your `.env` has the correct MongoDB configuration
3. Run the application with `npm run start:dev`
