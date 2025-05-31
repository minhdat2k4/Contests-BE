# API Documentation Guide

This guide explains how to use the Swagger/OpenAPI documentation system in this project for creating interactive API documentation.

## Accessing the Documentation

Once the server is running, you can access the interactive API documentation at:

- **Swagger UI**: `http://localhost:5000/api/v1/docs`
- **API Spec JSON**: `http://localhost:5000/api/v1/docs.json`

## Features

### 🎯 Interactive Testing
- Test API endpoints directly from the browser
- Authenticate using JWT tokens
- View request/response examples
- Real-time validation

### 📋 Comprehensive Documentation
- All endpoints automatically documented
- Request/response schemas
- Authentication requirements
- Error response examples

### 🔐 Security Testing
- Built-in authentication support
- JWT token management
- Role-based access testing

## How to Document New Routes

### 1. Basic Endpoint Documentation

Add Swagger comments above your route definitions:

```typescript
/**
 * @swagger
 * /api/v1/your-endpoint:
 *   get:
 *     summary: Short description
 *     description: Detailed description
 *     tags: [YourModule]
 *     responses:
 *       200:
 *         description: Success response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/YourSchema'
 */
router.get('/your-endpoint', YourController.yourMethod);
```

### 2. Protected Endpoints

For endpoints requiring authentication:

```typescript
/**
 * @swagger
 * /api/v1/protected-endpoint:
 *   post:
 *     summary: Protected endpoint
 *     description: This endpoint requires authentication
 *     tags: [YourModule]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/YourInputSchema'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/SuccessResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/protected-endpoint', authenticate, YourController.yourMethod);
```

### 3. Endpoints with Parameters

For endpoints with path or query parameters:

```typescript
/**
 * @swagger
 * /api/v1/resource/{id}:
 *   get:
 *     summary: Get resource by ID
 *     tags: [Resource]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Resource ID
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *         description: Related data to include
 *     responses:
 *       200:
 *         description: Resource found
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', validateParams(IdSchema), YourController.getById);
```

### 4. Paginated Endpoints

For endpoints returning paginated data:

```typescript
/**
 * @swagger
 * /api/v1/resources:
 *   get:
 *     summary: Get all resources
 *     tags: [Resource]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/PaginatedResponse'
 */
router.get('/', validateQuery(GetResourcesSchema), YourController.getAll);
```

## Predefined Schemas and Responses

The system includes predefined schemas and responses for consistency:

### Common Schemas
- `User` - User object
- `CreateUser` - User creation data
- `UpdateUser` - User update data
- `Login` - Login credentials
- `AuthResponse` - Authentication response
- `SuccessResponse` - Generic success response
- `PaginatedResponse` - Paginated data response

### Common Responses
- `BadRequest` (400)
- `Unauthorized` (401)
- `Forbidden` (403)
- `NotFound` (404)
- `Conflict` (409)
- `InternalServerError` (500)

## Adding New Schemas

When creating new modules, add your schemas to the Swagger configuration in `src/config/swagger.ts`:

```typescript
// In the components.schemas section
YourResource: {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'clxxx123456789' },
    name: { type: 'string', example: 'Resource Name' },
    description: { type: 'string', example: 'Resource description' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'name', 'createdAt', 'updatedAt'],
},
```

## Testing with Swagger UI

### 1. Authentication
1. Go to `/api/v1/docs`
2. Click the "Authorize" button (🔒)
3. Enter `Bearer <your-jwt-token>`
4. Click "Authorize"

### 2. Testing Endpoints
1. Find your endpoint in the documentation
2. Click "Try it out"
3. Fill in required parameters
4. Click "Execute"
5. View the response

### 3. Understanding Responses
- **Success responses** show expected data structure
- **Error responses** show error codes and messages
- **Schema** section shows data models

## Best Practices

### 1. Consistent Naming
- Use clear, descriptive summaries
- Follow REST conventions for descriptions
- Group related endpoints with consistent tags

### 2. Complete Documentation
- Always include all possible response codes
- Document all parameters and request bodies
- Provide meaningful examples

### 3. Security Documentation
- Always specify security requirements for protected endpoints
- Document required roles/permissions in descriptions

### 4. Response Examples
- Use realistic example data
- Include error response examples
- Show pagination structure for list endpoints

## Utility Functions

Use the helper functions from `src/utils/swagger.ts`:

```typescript
import { SwaggerResponses, SwaggerParameters } from '@/utils/swagger';

// Use predefined response templates
responses: {
  200: SwaggerResponses.success('Users retrieved successfully', '#/components/schemas/User'),
  400: SwaggerResponses.badRequest,
  401: SwaggerResponses.unauthorized,
}

// Use predefined parameters
parameters: [
  SwaggerParameters.idParam('User ID'),
  ...SwaggerParameters.pagination(),
  SwaggerParameters.search('Search users by name or email'),
]
```

## Automatic Updates

The documentation automatically updates when you:
- Add new routes with Swagger comments
- Modify existing route documentation
- Restart the development server

## Environment Configuration

The documentation includes multiple server environments:
- **Development**: `http://localhost:5000`
- **Production**: `https://api.contest.com` (update in `swagger.ts`)

## Troubleshooting

### Common Issues

1. **Documentation not showing**
   - Check if Swagger comments syntax is correct
   - Ensure the route file is included in the `apis` array in `swagger.ts`
   - Restart the server

2. **Authentication not working**
   - Ensure you're using the correct token format: `Bearer <token>`
   - Check if the token is valid and not expired

3. **Schema not found**
   - Verify the schema is defined in `swagger.ts`
   - Check the reference path (`#/components/schemas/YourSchema`)

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` to see detailed Swagger parsing information.

## Integration with Frontend

Frontend developers can:
1. Access the interactive documentation
2. Download the OpenAPI spec from `/api/v1/docs.json`
3. Generate client SDKs using the OpenAPI spec
4. Test endpoints before implementing frontend code

## Conclusion

This documentation system provides:
- ✅ **Zero configuration** for basic endpoints
- ✅ **Consistent API documentation**
- ✅ **Interactive testing environment**
- ✅ **Automatic schema validation**
- ✅ **Frontend-friendly API specification**

Simply add Swagger comments to your routes and the documentation updates automatically!
