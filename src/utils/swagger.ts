/**
 * Swagger Documentation Utilities
 * 
 * This file contains helper functions and templates for creating consistent
 * Swagger/OpenAPI documentation across all API endpoints.
 */

/**
 * Standard response templates for Swagger documentation
 */
export const SwaggerResponses = {
    /**
     * Success response with data
     */
    success: (description: string, dataSchema?: string) => ({
        description,
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string', example: description },
                        data: dataSchema ? { $ref: dataSchema } : { type: 'object' },
                    },
                },
            },
        },
    }),

    /**
     * Success response without data
     */
    successNoData: (description: string) => ({
        description,
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string', example: description },
                    },
                },
            },
        },
    }),

    /**
     * Paginated response
     */
    paginated: (description: string, itemSchema: string) => ({
        description,
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string', example: description },
                        data: {
                            type: 'object',
                            properties: {
                                items: {
                                    type: 'array',
                                    items: { $ref: itemSchema },
                                },
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
    }),

    /**
     * Standard error responses
     */
    badRequest: { $ref: '#/components/responses/BadRequest' },
    unauthorized: { $ref: '#/components/responses/Unauthorized' },
    forbidden: { $ref: '#/components/responses/Forbidden' },
    notFound: { $ref: '#/components/responses/NotFound' },
    conflict: { $ref: '#/components/responses/Conflict' },
    internalServerError: { $ref: '#/components/responses/InternalServerError' },
};

/**
 * Common parameter templates
 */
export const SwaggerParameters = {
    /**
     * ID path parameter
     */
    idParam: (description: string = 'Resource ID') => ({
        in: 'path' as const,
        name: 'id',
        required: true,
        schema: { type: 'string' },
        description,
    }),

    /**
     * Pagination query parameters
     */
    pagination: () => [
        {
            in: 'query' as const,
            name: 'page',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Page number',
        },
        {
            in: 'query' as const,
            name: 'limit',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
            description: 'Number of items per page',
        },
    ],

    /**
     * Search query parameter
     */
    search: (description: string = 'Search term') => ({
        in: 'query' as const,
        name: 'search',
        schema: { type: 'string' },
        description,
    }),

    /**
     * Sort query parameter
     */
    sort: (fields: string[] = ['createdAt', 'updatedAt']) => ({
        in: 'query' as const,
        name: 'sort',
        schema: { type: 'string', enum: fields },
        description: 'Sort field',
    }),

    /**
     * Order query parameter
     */
    order: () => ({
        in: 'query' as const,
        name: 'order',
        schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
        description: 'Sort order',
    }),
};

/**
 * Security requirements
 */
export const SwaggerSecurity = {
    /**
     * Bearer token authentication
     */
    bearerAuth: [{ bearerAuth: [] }],
};

/**
 * Template for creating a complete Swagger route documentation
 */
export interface SwaggerRouteConfig {
    summary: string;
    description: string;
    tags: string[];
    security?: typeof SwaggerSecurity.bearerAuth;
    parameters?: any[];
    requestBody?: any;
    responses: Record<number, any>;
}

/**
 * Helper function to create consistent Swagger documentation
 */
export const createSwaggerDoc = (config: SwaggerRouteConfig) => {
    const doc: any = {
        summary: config.summary,
        description: config.description,
        tags: config.tags,
    };

    if (config.security) {
        doc.security = config.security;
    }

    if (config.parameters) {
        doc.parameters = config.parameters;
    }

    if (config.requestBody) {
        doc.requestBody = config.requestBody;
    }

    doc.responses = config.responses;

    return doc;
};

/**
 * Request body templates
 */
export const SwaggerRequestBodies = {
    /**
     * JSON request body
     */
    json: (schema: string, required: boolean = true) => ({
        required,
        content: {
            'application/json': {
                schema: { $ref: schema },
            },
        },
    }),

    /**
     * Form data request body
     */
    formData: (properties: Record<string, any>, required: string[] = []) => ({
        required: true,
        content: {
            'multipart/form-data': {
                schema: {
                    type: 'object',
                    properties,
                    required,
                },
            },
        },
    }),
};

/**
 * Example usage templates for developers
 */
export const SwaggerExamples = {
    /**
     * Basic GET endpoint with pagination
     */
    basicGetWithPagination: `
/**
 * @swagger
 * /api/v1/resource:
 *   get:
 *     summary: Get all resources
 *     description: Retrieve a paginated list of resources
 *     tags: [Resource]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Resources retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */`,

    /**
     * Basic POST endpoint
     */
    basicPost: `
/**
 * @swagger
 * /api/v1/resource:
 *   post:
 *     summary: Create a new resource
 *     description: Create a new resource in the system
 *     tags: [Resource]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateResource'
 *     responses:
 *       201:
 *         description: Resource created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */`,

    /**
     * Basic PUT endpoint with ID parameter
     */
    basicPut: `
/**
 * @swagger
 * /api/v1/resource/{id}:
 *   put:
 *     summary: Update a resource
 *     description: Update an existing resource by ID
 *     tags: [Resource]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Resource ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateResource'
 *     responses:
 *       200:
 *         description: Resource updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */`,

    /**
     * Basic DELETE endpoint
     */
    basicDelete: `
/**
 * @swagger
 * /api/v1/resource/{id}:
 *   delete:
 *     summary: Delete a resource
 *     description: Delete an existing resource by ID
 *     tags: [Resource]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Resource ID
 *     responses:
 *       200:
 *         description: Resource deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */`,
};
