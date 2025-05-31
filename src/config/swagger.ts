import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import path from 'path';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Contest Backend API',
            version: '1.0.0',
            description: 'A comprehensive REST API for the Contest application',
            contact: {
                name: 'Contest API Support',
                email: 'support@contest.com',
            },
        },
        servers: [
            {
                url: process.env.API_URL || 'http://localhost:5000',
                description: 'Development server',
            },
            {
                url: 'https://api.contest.com',
                description: 'Production server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT token in the format: Bearer <token>',
                },
            },
            responses: {
                BadRequest: {
                    description: 'Bad Request',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean', example: false },
                                    message: { type: 'string', example: 'Validation error' },
                                    error: {
                                        type: 'object',
                                        properties: {
                                            code: { type: 'string', example: 'VALIDATION_ERROR' },
                                            details: { type: 'array', items: { type: 'string' } },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                Unauthorized: {
                    description: 'Unauthorized',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean', example: false },
                                    message: { type: 'string', example: 'Authentication required' },
                                    error: {
                                        type: 'object',
                                        properties: {
                                            code: { type: 'string', example: 'UNAUTHORIZED' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                Forbidden: {
                    description: 'Forbidden',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean', example: false },
                                    message: { type: 'string', example: 'Access denied' },
                                    error: {
                                        type: 'object',
                                        properties: {
                                            code: { type: 'string', example: 'FORBIDDEN' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                NotFound: {
                    description: 'Resource not found',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean', example: false },
                                    message: { type: 'string', example: 'Resource not found' },
                                    error: {
                                        type: 'object',
                                        properties: {
                                            code: { type: 'string', example: 'NOT_FOUND' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                Conflict: {
                    description: 'Conflict',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean', example: false },
                                    message: { type: 'string', example: 'Resource already exists' },
                                    error: {
                                        type: 'object',
                                        properties: {
                                            code: { type: 'string', example: 'CONFLICT' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                InternalServerError: {
                    description: 'Internal Server Error',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean', example: false },
                                    message: { type: 'string', example: 'Internal server error' },
                                    error: {
                                        type: 'object',
                                        properties: {
                                            code: { type: 'string', example: 'INTERNAL_ERROR' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: 'clxxx123456789' },
                        email: { type: 'string', format: 'email', example: 'user@example.com' },
                        username: { type: 'string', example: 'johndoe' },
                        fullName: { type: 'string', example: 'John Doe' },
                        role: { type: 'string', enum: ['USER', 'ADMIN'], example: 'USER' },
                        isActive: { type: 'boolean', example: true },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                    required: ['id', 'email', 'username', 'fullName', 'role', 'isActive', 'createdAt', 'updatedAt'],
                },
                CreateUser: {
                    type: 'object',
                    properties: {
                        email: { type: 'string', format: 'email', example: 'user@example.com' },
                        username: { type: 'string', minLength: 3, maxLength: 30, example: 'johndoe' },
                        fullName: { type: 'string', minLength: 2, maxLength: 100, example: 'John Doe' },
                        password: { type: 'string', minLength: 6, example: 'password123' },
                        role: { type: 'string', enum: ['USER', 'ADMIN'], example: 'USER' },
                    },
                    required: ['email', 'username', 'fullName', 'password'],
                },
                UpdateUser: {
                    type: 'object',
                    properties: {
                        username: { type: 'string', minLength: 3, maxLength: 30, example: 'johndoe' },
                        fullName: { type: 'string', minLength: 2, maxLength: 100, example: 'John Doe' },
                        role: { type: 'string', enum: ['USER', 'ADMIN'], example: 'USER' },
                        isActive: { type: 'boolean', example: true },
                    },
                },
                Login: {
                    type: 'object',
                    properties: {
                        email: { type: 'string', format: 'email', example: 'user@example.com' },
                        password: { type: 'string', example: 'password123' },
                    },
                    required: ['email', 'password'],
                },
                AuthResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string', example: 'Login successful' },
                        data: {
                            type: 'object',
                            properties: {
                                user: { $ref: '#/components/schemas/User' },
                                token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                                expiresIn: { type: 'string', example: '24h' },
                            },
                        },
                    },
                },
                SuccessResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string', example: 'Operation successful' },
                        data: { type: 'object' },
                    },
                },
                PaginatedResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string', example: 'Data retrieved successfully' },
                        data: {
                            type: 'object',
                            properties: {
                                items: { type: 'array', items: { type: 'object' } },
                                pagination: {
                                    type: 'object',
                                    properties: {
                                        page: { type: 'number', example: 1 },
                                        limit: { type: 'number', example: 10 },
                                        total: { type: 'number', example: 100 },
                                        pages: { type: 'number', example: 10 },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        tags: [
            {
                name: 'Authentication',
                description: 'Authentication and authorization endpoints',
            },
            {
                name: 'Users',
                description: 'User management endpoints',
            },
            {
                name: 'Health',
                description: 'Health check and system status endpoints',
            },
        ],
    },
    apis: [
        path.join(__dirname, '../modules/**/*.routes.ts'),
        path.join(__dirname, '../app.ts'),
    ],
};

const specs = swaggerJSDoc(options);

export const setupSwagger = (app: Express): void => {
    // Swagger UI options
    const swaggerOptions = {
        explorer: true,
        swaggerOptions: {
            persistAuthorization: true,
            displayRequestDuration: true,
            filter: true,
            showExtensions: true,
            showCommonExtensions: true,
            tryItOutEnabled: true,
        },
        customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #3b82f6 }
      .swagger-ui .scheme-container { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0; }
      .swagger-ui .btn.authorize { background-color: #3b82f6; border-color: #3b82f6; }
      .swagger-ui .btn.authorize:hover { background-color: #2563eb; border-color: #2563eb; }
    `,
        customSiteTitle: 'Contest API Documentation',
        customfavIcon: '/favicon.ico',
    };

    // Serve Swagger UI
    app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));

    // JSON endpoint for API specification
    app.get('/api/v1/docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(specs);
    });
};

export { specs };