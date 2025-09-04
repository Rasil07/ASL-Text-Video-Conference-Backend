# ASL Text Video Conference Backend

A Node.js Express server with TypeScript support for ASL (American Sign Language) text video conference functionality.

## Features

- 🚀 Express.js server with TypeScript
- 🔒 Security middleware (Helmet, CORS)
- 📝 Request logging with Morgan
- 🏥 Health check endpoint
- 🛠️ Error handling middleware
- 📦 Environment configuration
- 🔄 Hot reloading in development

## Prerequisites

- Node.js (v16 or higher)
- Yarn package manager

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd ASL-Text-Video-Conference-Backend
```

2. Install dependencies:

```bash
yarn install
```

3. Set up environment variables:

```bash
cp env.example .env
```

4. Edit the `.env` file with your configuration:

```env
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info
```

## Development

Start the development server with hot reloading:

```bash
yarn dev
```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

## Production

Build the project:

```bash
yarn build
```

Start the production server:

```bash
yarn start
```

## Available Scripts

- `yarn dev` - Start development server with hot reloading
- `yarn build` - Build the TypeScript project
- `yarn start` - Start the production server
- `yarn clean` - Clean the dist directory

## API Endpoints

### Health Check

- `GET /health` - Server health status

### API Routes

- `GET /api` - API information and available endpoints
- `GET /api/rooms` - Get all rooms (coming soon)
- `GET /api/users` - Get all users (coming soon)
- `GET /api/sessions` - Get all sessions (coming soon)

## Project Structure

```
src/
├── index.ts              # Main server entry point
├── middleware/           # Express middleware
│   ├── errorHandler.ts   # Error handling middleware
│   └── notFoundHandler.ts # 404 handler
└── routes/              # API routes
    ├── health.ts        # Health check routes
    └── api.ts           # Main API routes
```

## Technologies Used

- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **TypeScript** - Type-safe JavaScript
- **Helmet** - Security middleware
- **CORS** - Cross-origin resource sharing
- **Morgan** - HTTP request logger
- **Dotenv** - Environment variable management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License
