# LocalHeroes Backend Server

**LocalHeroes** is a community-driven platform designed to connect everyday people with local helpers, volunteers, and professionals. This is the backend server built with NestJS, providing APIs for user authentication, job management, messaging, and AI-powered customer support.

## Features

- User authentication with JWT tokens
- Job posting and management
- Real-time messaging with WebSocket support
- Location-based services with geocoding
- Email notifications
- AI-powered customer support with Google Gemini
- MongoDB database integration

## Prerequisites

Before running the server, make sure you have:

- Node.js (v16 or higher)
- MongoDB database
- Google AI API key for Gemini support

## Environment Setup

1. Clone the repository and navigate to the server directory:

   ```bash
   git clone https://github.com/RodrigoCardoso-10/CodeSwap.git
   cd LocalHeroes-Server-Repo
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:

   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/localheroes

   # JWT Configuration
   JWT_SECRET=your-jwt-secret-key
   JWT_EXPIRES_IN=1d
   REFRESH_TOKEN_SECRET=your-refresh-token-secret
   REFRESH_TOKEN_EXPIRES_IN=7d

   # Email Configuration (Optional - for notifications)
   MAIL_HOST=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USER=your-email@gmail.com
   MAIL_PASS=your-app-password

   # Google AI API Key (Required for AI Support)
   GOOGLE_AI_API_KEY=your-google-ai-api-key

   # Server Configuration
   PORT=3000
   ```

4. **Important**: To get your Google AI API key:
   - Go to [Google AI Studio](https://aistudio.google.com/)
   - Create an account or sign in
   - Generate an API key
   - Add it to your `.env` file as `GOOGLE_AI_API_KEY`

## Running the Server

### Development Mode

```bash
npm run start:dev
```

The server will start on `http://localhost:3000` with hot reload enabled.

### Production Mode

```bash
npm run build
npm run start:prod
```

### Database Setup

If you need to seed the database with initial data:

```bash
npm run seed
```

## API Endpoints

### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh JWT token

### Tasks/Jobs

- `GET /tasks` - Get all tasks
- `POST /tasks` - Create new task
- `GET /tasks/:id` - Get specific task
- `PUT /tasks/:id` - Update task

### Messages

- `POST /messages` - Send message
- `GET /messages/:conversationId` - Get conversation messages

### AI Support (New Feature)

- `POST /ai-support/chat` - Chat with AI assistant
- `GET /ai-support/suggestions` - Get quick help suggestions

### Users

- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update user profile

## AI Support Feature

The LocalHeroes platform now includes an AI-powered customer support agent using Google's Gemini 2.0 Flash model. This feature provides:

- **Intelligent Chat**: Users can ask questions about the platform and get helpful responses
- **Quick Suggestions**: Pre-defined helpful questions and answers
- **Context-Aware Responses**: The AI understands LocalHeroes platform specifics

### Using AI Support Endpoints

#### Chat with AI

```bash
POST /ai-support/chat
Content-Type: application/json

{
  "message": "How do I post a job on LocalHeroes?"
}
```

#### Get Quick Suggestions

```bash
GET /ai-support/suggestions
```

## Development Scripts

- `npm run start:dev` - Start in development mode with hot reload
- `npm run build` - Build the application
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run lint` - Lint the code
- `npm run format` - Format code with Prettier

## WebSocket Support

The server supports real-time communication through WebSocket for:

- Live messaging between users
- Real-time notifications
- Job status updates

Connect to WebSocket at: `ws://localhost:3000`

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**: Ensure MongoDB is running and the connection string is correct
2. **AI Support Not Working**: Verify your `GOOGLE_AI_API_KEY` is valid and has proper permissions
3. **JWT Errors**: Check that your JWT secrets are properly set in the `.env` file
4. **Port Already in Use**: Change the PORT in your `.env` file or stop other services using port 3000

### Testing the AI Feature

You can test the AI support feature using curl:

```bash
# Test AI chat
curl -X POST http://localhost:3000/ai-support/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is LocalHeroes?"}'

# Get suggestions
curl http://localhost:3000/ai-support/suggestions
```

## Technology Stack

- **Framework**: NestJS
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT with Passport
- **Real-time**: Socket.IO
- **AI**: Google Gemini 2.0 Flash
- **Email**: Nodemailer
- **Validation**: class-validator
- **Testing**: Jest

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Run the test suite
6. Submit a pull request

## License

This project is licensed under the UNLICENSED license.
