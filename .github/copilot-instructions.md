<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Contest Backend API - Copilot Instructions

This is a Node.js TypeScript backend project for a contest application with the following stack:

## Tech Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Validation**: Zod
- **Logging**: Winston
- **Security**: Helmet, CORS
- **Password**: bcrypt

## Project Structure
- **src/modules/**: Feature-based modules (user, etc.)
- **src/config/**: Configuration files (database, etc.)
- **src/middlewares/**: Express middlewares
- **src/utils/**: Utility functions
- **src/constants/**: Application constants
- **src/tests/**: Test files
- **prisma/**: Database schema and migrations

## Coding Guidelines
1. **Error Handling**: Always use the custom error handling system with proper error codes
2. **Validation**: Use Zod schemas for all input validation
3. **Logging**: Use the Winston logger for all logging operations
4. **Database**: Always use Prisma for database operations
5. **Security**: Hash passwords with bcrypt, validate inputs, use proper CORS
6. **TypeScript**: Use strict typing, define proper interfaces/types
7. **Testing**: Write comprehensive tests for all modules

## API Standards
- RESTful endpoints with proper HTTP methods
- Consistent response format: `{ success: boolean, message: string, data?: any, error?: any }`
- Proper status codes (200, 201, 400, 401, 403, 404, 409, 500)
- Input validation on all endpoints
- Error handling with descriptive messages

## Module Pattern
Each module should contain:
- `*.schema.ts`: Zod validation schemas and TypeScript types
- `*.service.ts`: Business logic and database operations
- `*.controller.ts`: Request/response handling
- `*.routes.ts`: Route definitions
- `*.test.ts`: Unit and integration tests

When adding new features:
1. Create proper Zod schemas for validation
2. Implement service methods with error handling
3. Create controller methods with proper logging
4. Define routes with validation middleware
5. Write comprehensive tests
6. Update Prisma schema if database changes needed
